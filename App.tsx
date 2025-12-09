import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  Sparkles,
  AlertCircle,
  Smartphone,
  Monitor,
  Zap,
  Star,
  Terminal,
  CheckCircle2,
  Lock,
  Upload,
  FileJson
} from 'lucide-react';
import { Button } from './components/Button';
import { VideoPlayer } from './components/VideoPlayer';
import { generateVeoVideo } from './services/veoService';
import { setCredentials } from './services/authService';
import { AspectRatio, Resolution, VeoModel, VideoGenerationState, ServiceAccount } from './types';
import { loadSettings, saveSettings } from './services/settingsService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const initialSettings = useMemo(() => (typeof window !== 'undefined' ? loadSettings() : null), []);
  const [prompt, setPrompt] = useState(initialSettings?.prompt ?? '');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialSettings?.aspectRatio ?? AspectRatio.Landscape);
  const [resolution, setResolution] = useState<Resolution>(initialSettings?.resolution ?? Resolution.HD);
  const [model, setModel] = useState<VeoModel>(initialSettings?.model ?? VeoModel.Fast);

  const [status, setStatus] = useState<VideoGenerationState>({
    isGenerating: false,
    progressMessage: '',
    videoUri: null,
    error: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveSettings({ prompt, aspectRatio, resolution, model });
  }, [prompt, aspectRatio, resolution, model]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as ServiceAccount;
        setCredentials(json);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (err) {
        console.error("Invalid key file", err);
        setAuthError("Invalid JSON file. Please upload a valid Google Cloud Service Account key.");
      }
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setStatus({
      isGenerating: true,
      progressMessage: 'Initializing job...',
      videoUri: null,
      error: null
    });

    try {
      const uri = await generateVeoVideo({
        prompt,
        aspectRatio,
        resolution,
        model
      }, (msg) => {
        setStatus(prev => ({ ...prev, progressMessage: msg }));
      });

      setStatus(prev => ({
        ...prev,
        isGenerating: false,
        videoUri: uri,
        progressMessage: ''
      }));
    } catch (err: any) {
      console.error(err);
      setStatus(prev => ({
        ...prev,
        isGenerating: false,
        error: err.message || 'Generation failed',
        progressMessage: ''
      }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
        <div className="max-w-md w-full border border-zinc-800 bg-zinc-950/50 p-8 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-white text-black flex items-center justify-center rounded-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-mono font-medium tracking-wide uppercase">System Locked</h1>
              <p className="text-zinc-500 text-xs font-mono">Authentication Required</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full border border-dashed border-zinc-700 bg-black p-8 flex flex-col items-center justify-center gap-3 transition-colors group-hover:bg-zinc-900 group-hover:border-zinc-500">
                <FileJson className="w-8 h-8 text-zinc-600 group-hover:text-white transition-colors" />
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300">
                  Select Service Account JSON
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[10px] text-zinc-600 font-mono leading-relaxed">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <p>
                Upload your Google Cloud Service Account key file.
                The key is processed locally in your browser and used to sign requests to Vertex AI.
                It is never sent to any third-party server.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-500 text-xs font-mono break-words whitespace-pre-wrap max-h-32 overflow-y-auto">
                {authError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-white selection:text-black">

      {/* Header */}
      <header className="border-b border-zinc-800 bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white flex items-center justify-center rounded-sm">
              <Video className="w-3 h-3 text-black" />
            </div>
            <span className="font-medium text-sm tracking-wide text-white">VEO<span className="text-zinc-500 ml-1">STUDIO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Vertex AI
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs text-zinc-600 hover:text-white transition-colors font-mono uppercase"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">

          {/* Left Panel: Inputs */}
          <div className="lg:col-span-4 space-y-8">

            {/* Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="prompt" className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  Prompt
                </label>
              </div>
              <textarea
                id="prompt"
                rows={6}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-white focus:ring-0 transition-colors resize-none font-sans"
                placeholder="Describe your scene..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="h-px bg-zinc-900 w-full"></div>

            {/* Config Grid */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Upload className="w-3 h-3 text-zinc-600" />
                <h3 className="text-xs font-mono font-medium text-zinc-600 uppercase tracking-widest">Configuration</h3>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAspectRatio(AspectRatio.Landscape)}
                    className={`flex items-center justify-center gap-2 p-3 rounded border text-sm font-medium transition-colors ${aspectRatio === AspectRatio.Landscape
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'
                      }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span>16:9</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio(AspectRatio.Portrait)}
                    className={`flex items-center justify-center gap-2 p-3 rounded border text-sm font-medium transition-colors ${aspectRatio === AspectRatio.Portrait
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'
                      }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>9:16</span>
                  </button>
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500">Resolution</label>
                <div className="flex bg-black p-1 rounded border border-zinc-800">
                  {[Resolution.HD, Resolution.FHD].map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${resolution === res
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500">Model</label>
                <div className="grid grid-cols-1 gap-2">
                  <div
                    onClick={() => setModel(VeoModel.Fast)}
                    className={`cursor-pointer px-4 py-3 rounded border flex items-center justify-between transition-colors ${model === VeoModel.Fast
                        ? 'bg-zinc-900 border-zinc-600'
                        : 'bg-black border-zinc-800 hover:border-zinc-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className={`w-4 h-4 ${model === VeoModel.Fast ? 'text-white' : 'text-zinc-600'}`} />
                      <div className="text-sm font-medium text-zinc-200">Veo Fast</div>
                    </div>
                    {model === VeoModel.Fast && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>

                  <div
                    onClick={() => setModel(VeoModel.Quality)}
                    className={`cursor-pointer px-4 py-3 rounded border flex items-center justify-between transition-colors ${model === VeoModel.Quality
                        ? 'bg-zinc-900 border-zinc-600'
                        : 'bg-black border-zinc-800 hover:border-zinc-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Star className={`w-4 h-4 ${model === VeoModel.Quality ? 'text-white' : 'text-zinc-600'}`} />
                      <div className="text-sm font-medium text-zinc-200">Veo Quality</div>
                    </div>
                    {model === VeoModel.Quality && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                isLoading={status.isGenerating}
                className="w-full h-12 text-sm uppercase tracking-wide"
                icon={<Sparkles className="w-4 h-4" />}
              >
                Generate Scene
              </Button>
            </div>

            {status.error && (
              <div className="p-4 border border-red-900/50 bg-red-950/10 text-red-500 text-xs font-mono flex gap-3 items-start overflow-hidden">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="break-words whitespace-pre-wrap max-h-60 overflow-y-auto w-full custom-scrollbar">
                  {status.error}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Display */}
          <div className="lg:col-span-8 sticky top-24">
            <div className="relative border border-zinc-800 bg-black">
              {/* Technical Header */}
              <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950">
                <div className="text-[10px] font-mono text-zinc-500 uppercase flex gap-4">
                  <span>FMT: MP4</span>
                  <span>CODEC: H.264</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  {aspectRatio === AspectRatio.Landscape ? '1920x1080' : '1080x1920'} / {model === VeoModel.Fast ? 'FAST' : 'HQ'}
                </div>
              </div>

              {/* Video Area */}
              <div className="bg-black relative min-h-[500px] flex items-center justify-center p-8">
                {status.isGenerating && (
                  <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 border border-zinc-800 border-t-white rounded-full animate-spin mb-6"></div>
                    <h3 className="text-sm font-medium text-white uppercase tracking-widest mb-2">Processing</h3>
                    <p className="text-zinc-500 text-xs font-mono">{status.progressMessage}</p>
                  </div>
                )}

                <div className="w-full h-full flex items-center justify-center">
                  <VideoPlayer uri={status.videoUri} aspectRatio={aspectRatio} />
                </div>
              </div>

              {/* Footer Info */}
              <div className="border-t border-zinc-800 p-3 flex justify-between items-center bg-zinc-950">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${status.isGenerating ? 'bg-white animate-pulse' : 'bg-zinc-800'}`}></div>
                  <span className="text-[10px] text-zinc-600 font-mono uppercase">
                    {status.isGenerating ? 'RENDERING STREAM' : 'SYSTEM IDLE'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-800 font-mono">REF: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
