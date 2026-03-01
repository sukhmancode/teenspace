import { useEffect, useState, useRef, createContext, useContext } from "react";
import Peer from "peerjs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [peer, setPeer] = useState<Peer | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteUser, setRemoteUser] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [ringtoneAudio] = useState(() => new Audio("/sounds/ringtone.mp3"));

  useEffect(() => {
    ringtoneAudio.loop = true;
  }, [ringtoneAudio]);

  useEffect(() => {
    if (isIncoming) {
      ringtoneAudio.play().catch(console.error);
    } else {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
    return () => ringtoneAudio.pause();
  }, [isIncoming, ringtoneAudio]);

  useEffect(() => {
    if (!user) return;

    const peerId = `social-app-${user.id}`;
    const newPeer = new Peer(peerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ]
      }
    });

    newPeer.on("open", (id) => {
      console.log("Peer ID:", id);
    });

    newPeer.on("call", (incomingCall) => {
      setRemoteUser(incomingCall.metadata?.caller);
      setIsVideo(!!incomingCall.metadata?.video);
      setCall(incomingCall);
      setIsIncoming(true);
      
      // Add visual notification for incoming call
      toast({
        title: `Incoming ${incomingCall.metadata?.video ? "Video" : "Voice"} Call`,
        description: `From ${incomingCall.metadata?.caller?.displayName}`,
      });

      incomingCall.on("close", () => {
        endCall();
      });
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [user]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOff(!isSpeakerOff);
  };

  const startCall = async (targetUserId: number, targetUser: any, conversationId?: number, video = false) => {
    if (!peer || !user) return;

    try {
      // Try to get media with a timeout and clearer error handling
      const constraints = { 
        audio: true, 
        video: video ? { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setRemoteUser(targetUser);
      setIsVideo(video);
      setIsCalling(true);
      setIsMuted(false);
      setIsSpeakerOff(false);

      const outgoingCall = peer.call(`social-app-${targetUserId}`, stream, {
        metadata: { caller: user, conversationId, video }
      });

      outgoingCall.on("stream", (remoteStream) => {
        setActiveStream(remoteStream);
      });

      outgoingCall.on("close", () => {
        endCall();
      });

      setCall(outgoingCall);
    } catch (err: any) {
      console.error("Call error details:", err);
      let errorMessage = "Please check your browser permissions for camera and microphone.";
      
      if (err.name === 'NotAllowedError') {
        errorMessage = "Microphone/Camera access was denied. Please enable it in your browser settings and refresh.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No microphone or camera found on this device.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Your microphone or camera is already being used by another application.";
      }

      toast({ 
        title: "Connection Error", 
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const answerCall = async () => {
    if (!call) return;

    try {
      const constraints = { 
        audio: true, 
        video: isVideo ? { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      call.answer(stream);
      setIsMuted(false);
      setIsSpeakerOff(false);
      
      call.on("stream", (remoteStream: MediaStream) => {
        setActiveStream(remoteStream);
        setIsIncoming(false);
        setIsCalling(true);
      });

      call.on("close", () => {
        endCall();
      });
    } catch (err: any) {
      console.error("Answer call error:", err);
      toast({ 
        title: "Connection Error", 
        description: "Could not access media devices to answer the call.",
        variant: "destructive"
      });
      endCall();
    }
  };

  const endCall = () => {
    const currentCall = call;
    
    if (currentCall) {
      const conversationId = currentCall.metadata?.conversationId;
      const isVideoCall = currentCall.metadata?.video;
      if (conversationId && !activeStream && isCalling) {
        apiRequest("POST", `/api/conversations/${conversationId}/call-log`, { 
          type: isVideoCall ? 'missed_video' : 'missed' 
        }).catch(console.error);
      } else if (conversationId && activeStream) {
        apiRequest("POST", `/api/conversations/${conversationId}/call-log`, { 
          type: isVideoCall ? 'ended_video' : 'ended' 
        }).catch(console.error);
      }
      
      try {
        currentCall.close();
      } catch (err) {
        console.error("Error closing call:", err);
      }
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setCall(null);
    setIsIncoming(false);
    setIsCalling(false);
    setIsVideo(false);
    setActiveStream(null);
    setLocalStream(null);
    setRemoteUser(null);
    setIsMuted(false);
    setIsSpeakerOff(false);
  };

  return (
    <>
      <CallContext.Provider value={{ startCall }}>
        {children}
      </CallContext.Provider>

      <Dialog open={isIncoming} onOpenChange={(open) => !open && endCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Incoming {isVideo ? "Video" : "Voice"} Call</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={remoteUser?.avatarUrl} />
              <AvatarFallback>{remoteUser?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold">{remoteUser?.displayName}</h3>
            <p className="text-muted-foreground">@{remoteUser?.username}</p>
          </div>
          <DialogFooter className="flex items-center justify-center gap-6 pb-8">
            <Button variant="destructive" size="icon" className="rounded-full w-16 h-16 shadow-lg active:scale-90 transition-transform" onClick={endCall}>
              <PhoneOff className="w-8 h-8" />
            </Button>
            <Button variant="default" size="icon" className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 shadow-lg active:scale-90 transition-transform" onClick={answerCall}>
              {isVideo ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalling} onOpenChange={() => {}}>
        <DialogContent className={cn("sm:max-w-md overflow-hidden p-0", isVideo && "max-w-4xl h-[80vh]")}>
          {isVideo ? (
            <div className="relative w-full h-full bg-black flex items-center justify-center min-h-[400px]">
              {activeStream ? (
                <RemoteVideo stream={activeStream} muted={isSpeakerOff} />
              ) : (
                <div className="flex flex-col items-center text-white">
                  <Avatar className="w-24 h-24 mb-4 ring-4 ring-primary animate-pulse">
                    <AvatarImage src={remoteUser?.avatarUrl} />
                    <AvatarFallback>{remoteUser?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold">{remoteUser?.displayName}</h3>
                  <p className="text-muted-foreground text-white/70">Calling...</p>
                </div>
              )}
              
              <div className="absolute top-4 right-4 w-32 aspect-video bg-muted rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <LocalVideo stream={localStream} />
              </div>

              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-4">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className={cn("rounded-full w-12 h-12 bg-white/20 backdrop-blur-md border-none text-white", isMuted && "bg-destructive")}
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full w-14 h-14 shadow-xl active:scale-90 transition-transform" onClick={endCall}>
                  <PhoneOff className="w-8 h-8" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="pt-6">
                <DialogTitle className="text-center">{activeStream ? "In Call" : "Calling..."}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-6">
                <Avatar className="w-24 h-24 mb-4 ring-4 ring-primary animate-pulse">
                  <AvatarImage src={remoteUser?.avatarUrl} />
                  <AvatarFallback>{remoteUser?.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{remoteUser?.displayName}</h3>
                <p className="text-muted-foreground">@{remoteUser?.username}</p>
                {activeStream && (
                  <div className="mt-4 flex items-center gap-2 text-green-500">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Connected
                  </div>
                )}
              </div>
              <DialogFooter className="flex items-center justify-center gap-4 pb-8 flex-wrap">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn("rounded-full w-14 h-14", isMuted && "bg-destructive text-white border-none")}
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn("rounded-full w-14 h-14", isSpeakerOff && "bg-muted text-muted-foreground")}
                  onClick={toggleSpeaker}
                >
                  {isSpeakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full w-16 h-16 shadow-xl active:scale-90 transition-transform" onClick={endCall}>
                  <PhoneOff className="w-8 h-8" />
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {!isVideo && activeStream && <RemoteAudio stream={activeStream} muted={isSpeakerOff} />}
    </>
  );
}

function RemoteAudio({ stream, muted }: { stream: MediaStream, muted: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current) audioRef.current.srcObject = stream;
  }, [stream]);
  return <audio ref={audioRef} autoPlay muted={muted} />;
}

function RemoteVideo({ stream, muted }: { stream: MediaStream, muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" muted={muted} />;
}

function LocalVideo({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />;
}

const CallContext = createContext<{ startCall: (id: number, user: any, conversationId?: number, video?: boolean) => void } | null>(null);
export const useVoiceCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useVoiceCall must be used within VoiceCallProvider");
  return context;
};