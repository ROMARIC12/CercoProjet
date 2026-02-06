import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Maximize2,
  Minimize2,
  Clock,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack 
} from 'agora-rtc-sdk-ng';

interface VideoCallProps {
  channelName: string;
  token: string;
  appId: string;
  uid: number;
  isDoctor?: boolean;
  duration?: number; // in minutes
  onCallEnd: () => void;
}

export function VideoCall({ 
  channelName, 
  token, 
  appId, 
  uid,
  isDoctor = false,
  duration = 30,
  onCallEnd 
}: VideoCallProps) {
  const { toast } = useToast();
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);
  const [isConnecting, setIsConnecting] = useState(true);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      toast({
        title: 'Temps écoulé',
        description: 'La consultation est terminée.',
      });
      handleEndCall();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Agora
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        // If no appId provided, fetch it
        let actualAppId = appId;
        let actualToken = token;
        
        if (!actualAppId || !actualToken) {
          // Fetch token and appId from edge function
          const response = await fetch(
            `https://mspthbyftwzqhpbjfeit.supabase.co/functions/v1/agora-token`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                channelName,
                role: 'publisher',
                uid
              })
            }
          );
          
          if (!response.ok) {
            throw new Error('Failed to get Agora token');
          }
          
          const data = await response.json();
          actualAppId = data.appId;
          actualToken = data.token;
          
          console.log('[Agora] Fetched token:', { appId: actualAppId, hasToken: !!actualToken });
        }
        
        if (!actualAppId) {
          throw new Error('Missing Agora App ID');
        }

        // Create client
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // Handle remote user events
        client.on('user-published', async (user, mediaType) => {
          if (!isMounted) return;
          await client.subscribe(user, mediaType);
          console.log('[Agora] Subscribed to user:', user.uid, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUser(user);
            if (remoteVideoRef.current) {
              user.videoTrack?.play(remoteVideoRef.current);
            }
          }
          
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          console.log('[Agora] User unpublished:', user.uid, mediaType);
          if (mediaType === 'video') {
            setRemoteUser(null);
          }
        });

        client.on('user-left', (user) => {
          console.log('[Agora] User left:', user.uid);
          if (!isMounted) return;
          setRemoteUser(null);
          toast({
            title: 'Déconnexion',
            description: isDoctor ? 'Le patient a quitté la consultation.' : 'Le médecin a quitté la consultation.',
          });
        });

        console.log('[Agora] Joining channel:', channelName, 'with appId:', actualAppId);

        // Join channel - use null for token if not using token auth
        await client.join(actualAppId, channelName, actualToken || null, uid);
        console.log('[Agora] Joined channel successfully');

        // Create and publish local tracks
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        
        if (!isMounted) {
          audioTrack.close();
          videoTrack.close();
          return;
        }
        
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        // Play local video
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        // Publish tracks
        await client.publish([audioTrack, videoTrack]);
        console.log('[Agora] Published local tracks');

        if (isMounted) {
          setIsConnecting(false);
          toast({
            title: 'Connecté',
            description: 'Vous êtes maintenant en téléconsultation.',
          });
        }
      } catch (error) {
        console.error('[Agora] Error:', error);
        if (isMounted) {
          setIsConnecting(false);
          toast({
            variant: 'destructive',
            title: 'Erreur de connexion',
            description: 'Impossible de se connecter à la vidéoconférence. Vérifiez vos permissions caméra/micro.',
          });
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      // Cleanup
      localAudioTrack?.close();
      localVideoTrack?.close();
      clientRef.current?.leave();
    };
  }, [appId, channelName, token, uid, isDoctor, toast]);

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleEndCall = async () => {
    try {
      localAudioTrack?.close();
      localVideoTrack?.close();
      await clientRef.current?.leave();
    } catch (error) {
      console.error('Error ending call:', error);
    }
    onCallEnd();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative'} bg-background`}>
      {/* Header with timer */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <Badge 
          variant={timeRemaining < 300 ? 'destructive' : 'secondary'}
          className="text-lg px-4 py-2"
        >
          <Clock className="h-4 w-4 mr-2" />
          {formatTime(timeRemaining)}
        </Badge>
        
        <Button variant="outline" size="icon" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Video Container */}
      <div className={`relative ${isFullscreen ? 'h-screen' : 'h-[70vh]'} bg-black rounded-lg overflow-hidden`}>
        {/* Remote Video (Main) */}
        <div 
          ref={remoteVideoRef} 
          className="absolute inset-0 bg-muted flex items-center justify-center"
        >
          {!remoteUser && (
            <div className="text-center">
              <User className="h-24 w-24 mx-auto text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mt-4">
                {isConnecting 
                  ? 'Connexion en cours...' 
                  : isDoctor 
                    ? 'En attente du patient...' 
                    : 'En attente du médecin...'
                }
              </p>
            </div>
          )}
        </div>

        {/* Local Video (PIP) */}
        <div 
          ref={localVideoRef}
          className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 bg-muted rounded-lg overflow-hidden border-2 border-background shadow-lg"
        >
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <VideoOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <Button
          variant={isAudioEnabled ? 'secondary' : 'destructive'}
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={toggleAudio}
        >
          {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        <Button
          variant={isVideoEnabled ? 'secondary' : 'destructive'}
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
