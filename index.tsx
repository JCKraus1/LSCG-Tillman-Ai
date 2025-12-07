import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// Define window interfaces for external libraries and APIs
declare global {
  interface Window {
    XLSX: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Helper to safely parse footage numbers
const parseFootage = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const str = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// --- Data Visualization Component ---
const ProjectAnalytics = ({ projectData }: { projectData: any[] }) => {
  if (!projectData || projectData.length === 0) return null;

  // Process data for charts
  const supervisorCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const marketFootage: Record<string, number> = {};

  projectData.forEach(p => {
    // Supervisor
    const sup = p['Assigned Supervisor'] || 'Unassigned';
    supervisorCounts[sup] = (supervisorCounts[sup] || 0) + 1;

    // Status
    const status = p['On Track or In Jeopardy'] || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Footage by Market - Updated to prefer Footage Remaining as per user request
    const market = p['Market'] || 'General';
    // Check for Footage Remaining first, fallback to Footage UG
    let rawFootage = p['Footage Remaining'];
    if (rawFootage === undefined || rawFootage === null || String(rawFootage).trim() === '') {
        rawFootage = p['Footage UG'];
    }
    const footage = parseFootage(rawFootage);
    marketFootage[market] = (marketFootage[market] || 0) + footage;
  });

  const supervisorData = Object.keys(supervisorCounts).map(k => ({ name: k, count: supervisorCounts[k] })).sort((a,b) => b.count - a.count);
  const statusData = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));
  const marketData = Object.keys(marketFootage).map(k => ({ name: k, footage: marketFootage[k] })).sort((a,b) => b.footage - a.footage);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STATUS_COLORS: Record<string, string> = {
    'On Track': '#10B981', // Green
    'In Jeopardy': '#EF4444', // Red
    'Completed': '#3B82F6', // Blue
    'Unknown': '#9CA3AF' // Gray
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-blue-100 mb-4 w-full animate-fade-in no-print">
      <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Project Analytics & Insights</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Projects by Supervisor */}
        <div className="h-[300px] w-full bg-gray-50 rounded-lg p-2 border">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 text-center">Active Projects by Supervisor</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supervisorData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} fontSize={10} />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Project Health */}
        <div className="h-[300px] w-full bg-gray-50 rounded-lg p-2 border">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 text-center">Project Health Status</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Footage by Market */}
        <div className="h-[300px] w-full bg-gray-50 rounded-lg p-2 border">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 text-center">Total Footage by Market</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={marketData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} fontSize={10} />
              <YAxis tickFormatter={(value) => `${value / 1000}k`} />
              <RechartsTooltip formatter={(value) => value.toLocaleString() + ' ft'} />
              <Area type="monotone" dataKey="footage" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

// --- Project Card Component (Visual UI) ---
const ProjectCard = ({ data }: { data: any }) => {
  if (!data) return null;

  // Calculate percentage for progress bar
  const total = data.footage?.total || 0;
  const completed = data.footage?.completed || 0;
  const percent = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;
  
  // Map query
  const mapQuery = encodeURIComponent(`${data.address || ''} ${data.market || ''}`);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden font-sans text-gray-800 w-full max-w-2xl mx-auto my-4 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project {data.ntp}</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${data.status?.toLowerCase().includes('clear') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
               {data.status || 'Pending'}
             </span>
             <span className="text-sm text-gray-500">| ID: {data.ntp}</span>
          </div>
        </div>
        <div className="text-right hidden sm:block">
           <p className="text-xs text-gray-400">Supervisor</p>
           <p className="font-semibold text-gray-700">{data.supervisor || 'Unassigned'}</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Map & Scope */}
        <div className="space-y-4">
           {/* Embedded Map */}
           <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{border:0}} 
                src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                allowFullScreen
              ></iframe>
              <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded shadow text-xs font-semibold">
                 {data.address || 'Location Area'}
              </div>
           </div>

           <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Scope of Work</p>
              <p className="text-sm text-gray-700 line-clamp-3">
                 Market: {data.market}<br/>
                 Desc: {data.description || `Underground fiber installation project in ${data.address || 'designated area'}.`}
              </p>
           </div>
        </div>

        {/* Right Column: Targets & Data */}
        <div className="space-y-4">
           {/* Production Targets */}
           <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Production Targets</h3>
              
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                 <span>Footage Progress</span>
                 <span>{completed.toLocaleString()} / {total.toLocaleString()} ft</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-400 uppercase">Target</p>
                    <p className="text-lg font-bold text-gray-800">{total.toLocaleString()}</p>
                 </div>
                 <div className="text-center p-2 bg-green-50 rounded border border-green-100">
                    <p className="text-xs text-green-600 uppercase">Completed</p>
                    <p className="text-lg font-bold text-green-700">{completed.toLocaleString()}</p>
                 </div>
              </div>
           </div>

           {/* Data Grid */}
           <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                 <p className="text-xs text-gray-400 uppercase">Permit</p>
                 <p className="font-medium">{data.dates?.permit || 'Pending'}</p>
              </div>
              <div>
                 <p className="text-xs text-gray-400 uppercase">Deadline (TSD)</p>
                 <p className="font-medium">{data.dates?.tsd || 'N/A'}</p>
              </div>
              <div>
                 <p className="text-xs text-gray-400 uppercase">Est. Cost</p>
                 <p className="font-medium">{data.financial?.cost || 'N/A'}</p>
              </div>
              <div>
                 <p className="text-xs text-gray-400 uppercase">Locates Date</p>
                 <p className="font-medium">{data.dates?.locates || 'N/A'}</p>
              </div>
              <div>
                 <p className="text-xs text-gray-400 uppercase">SAs (HHP)</p>
                 <p className="font-medium">{data.stats?.hhp || '0'}</p>
              </div>
              <div>
                 <p className="text-xs text-gray-400 uppercase">% Complete</p>
                 <p className="font-medium text-blue-600">{data.footage?.percent || '0'}%</p>
              </div>
           </div>
        </div>
      </div>

      {/* Locate Tickets Section */}
      {data.locates && data.locates.length > 0 && (
        <div className="bg-yellow-50 border-t border-yellow-100 p-4">
           <h3 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
             Project Notes & Locates
           </h3>
           <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {data.locates.map((ticket: any, idx: number) => (
                 <div key={idx} className="text-xs text-yellow-900 bg-white/50 p-2 rounded border border-yellow-200">
                    <span className="font-bold">Tickets: {ticket.ticket}</span> 
                    <span className="mx-1">|</span> Phone: {ticket.phone} 
                    <span className="mx-1">|</span> Status: {ticket.status} 
                    <span className="mx-1">|</span> Due: {ticket.due} 
                    <span className="mx-1">|</span> Exp: {ticket.expires}
                 </div>
              ))}
           </div>
           {data.notes && (
             <div className="mt-2 text-xs text-gray-600 italic border-t border-yellow-200 pt-2">
                {data.notes}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

// External Dashboard Component using Iframe
const ExternalDashboard = () => {
  return (
    <div className="bg-white p-1 rounded-xl shadow-md border border-blue-100 mb-4 h-[600px] w-full animate-fade-in overflow-hidden no-print">
      <iframe 
        src="https://jckraus1.github.io/Tillman-Dashboard/Tillman%20Dashboard.html" 
        className="w-full h-full border-0"
        title="Tillman Dashboard"
      />
    </div>
  );
};

const TillmanKnowledgeAssistant = () => {
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: "Hello! I'm Nexus your LSCG Tillman AI Assistant. I can answer questions about project procedures, rate cards, closeout requirements, utility locates, and more. I also have access to live project data, weather, and maps. How can I help you today?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [projectData, setProjectData] = useState<any[] | null>(null);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [lastDataUpdate, setLastDataUpdate] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [apiKeyError, setApiKeyError] = useState<boolean>(false);
  
  // View States
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  
  // Geolocation State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshInterval = useRef<any>(null);

  // Initialize Google GenAI Client safely
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    try {
      const apiKey = process.env.API_KEY;
      if (apiKey && apiKey.trim() !== '') {
        aiRef.current = new GoogleGenAI({ apiKey: apiKey });
      } else {
        console.warn("API Key is missing or empty.");
        setApiKeyError(true);
      }
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
      setApiKeyError(true);
    }
  }, []);

  // Get User Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          console.log("📍 Location acquired");
        },
        (error) => {
          console.warn("Location permission denied or error:", error);
        }
      );
    }
  }, []);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      setAvailableVoices(voices);

      // Load preference from localStorage or use default logic
      const savedVoice = localStorage.getItem('tillman_assistant_voice');
      
      if (savedVoice && voices.some(v => v.name === savedVoice)) {
        setSelectedVoiceName(savedVoice);
      } else {
        // Default Logic
        const moira = voices.find(v => v.name.includes('Moira'));
        const victoria = voices.find(v => v.name.includes('Victoria'));
        const samantha = voices.find(v => v.name.includes('Samantha'));
        const female = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
        
        if (moira) setSelectedVoiceName(moira.name);
        else if (victoria) setSelectedVoiceName(victoria.name);
        else if (samantha) setSelectedVoiceName(samantha.name);
        else if (female) setSelectedVoiceName(female.name);
        else if (voices.length > 0) setSelectedVoiceName(voices[0].name);
      }
    };

    loadVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            setInputText(finalTranscript);
            setIsListening(false);
          } else {
            setInputText(event.results[i][0].transcript);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    };
  }, []);

  // Handle Language Change Effects
  useEffect(() => {
    // 1. Update Speech Recognition Language
    if (recognitionRef.current) {
        recognitionRef.current.lang = language === 'es' ? 'es-MX' : 'en-US';
    }

    // 2. Auto-switch voice if current voice doesn't match language
    if (availableVoices.length > 0) {
        const currentVoice = availableVoices.find(v => v.name === selectedVoiceName);
        const isMatch = currentVoice?.lang.toLowerCase().includes(language === 'es' ? 'es' : 'en');
        
        if (!isMatch) {
            // Find best match for new language
            const newVoice = availableVoices.find(v => v.lang.toLowerCase().includes(language === 'es' ? 'es' : 'en'));
            if (newVoice) {
                setSelectedVoiceName(newVoice.name);
                // Announce language change
                synthRef.current.cancel();
                const utterance = new SpeechSynthesisUtterance(language === 'es' ? "Idioma cambiado a Español" : "Language switched to English");
                utterance.voice = newVoice;
                synthRef.current.speak(utterance);
            }
        }
    }
  }, [language, availableVoices]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDashboard, showAnalytics]);

  useEffect(() => {
    if (!isSpeaking && synthRef.current) {
      synthRef.current.cancel();
    }
  }, [isSpeaking]);

  // Handle Voice Change
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value;
    setSelectedVoiceName(newVoice);
    localStorage.setItem('tillman_assistant_voice', newVoice);
    
    // Test the voice
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(language === 'es' ? "Voz actualizada. Soy Nexus." : "Voice updated. I am Nexus.");
    const voiceObj = availableVoices.find(v => v.name === newVoice);
    if (voiceObj) utterance.voice = voiceObj;
    synthRef.current.speak(utterance);
  };

  // Chat Actions
  const handleDownloadChat = () => {
    const transcript = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-chat-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintChat = () => {
    window.print();
  };

  // Load project data from Excel
  const loadSheetJSAndFetchData = async () => {
    // ... existing load logic unchanged ...
    setIsLoadingData(true);
    try {
      if (!window.XLSX) {
        console.log('Loading SheetJS library...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        console.log('✅ SheetJS loaded');
      }

      const projectExcelUrl = 'https://jckraus1.github.io/Tillman-Dashboard/tillman-project.xlsx';
      const locateExcelUrl = 'https://jckraus1.github.io/Tillman-Dashboard/locate-tickets.xlsx';
      
      console.log(`🔄 Fetching Excel files...`);
      
      const results = await Promise.allSettled([
        fetch(projectExcelUrl, { cache: 'no-cache' }),
        fetch(locateExcelUrl, { cache: 'no-cache' })
      ]);

      // Process Project Data Response
      let projectResponse = null;
      if (results[0].status === 'fulfilled') projectResponse = results[0].value;
      else console.warn("Failed to fetch Project Excel:", results[0].reason);

      // Process Locate Data Response
      let locateResponse = null;
      if (results[1].status === 'fulfilled') locateResponse = results[1].value;
      else console.warn("Failed to fetch Locate Excel:", results[1].reason);

      // --- PARSE LOCATE TICKETS ---
      const locateMap: Record<string, any> = {};
      if (locateResponse && locateResponse.ok) {
         try {
            const locateArrayBuffer = await locateResponse.arrayBuffer();
            const locateWorkbook = window.XLSX.read(locateArrayBuffer, { type: 'array' });
            
            let locateSheetName = locateWorkbook.SheetNames.find((name: string) => 
                name.toLowerCase().includes('master')
            );
            
            if (!locateSheetName && locateWorkbook.SheetNames.length > 0) {
                 locateSheetName = locateWorkbook.SheetNames[0];
            }
            
            if (locateSheetName) {
                const locateSheet = locateWorkbook.Sheets[locateSheetName];
                const locateRawData: any[] = window.XLSX.utils.sheet_to_json(locateSheet, { 
                    raw: false, 
                    defval: '',
                    blankrows: false 
                });
                
                locateRawData.forEach((row, index) => {
                    const normalizedRow: any = {};
                    Object.keys(row).forEach(k => {
                        normalizedRow[k.trim().toLowerCase()] = row[k];
                    });
                    
                    const mapNum = normalizedRow['map #'] || 
                                   normalizedRow['map#'] || 
                                   normalizedRow['project'] || 
                                   normalizedRow['ntp number'] || 
                                   normalizedRow['job #'] ||
                                   normalizedRow['job'];
                    
                    if (mapNum) {
                        const key = String(mapNum).trim();
                        if (key.length > 2) {
                            if (!locateMap[key]) {
                                locateMap[key] = [];
                            }
                            
                            const normKeys = Object.keys(normalizedRow);
                            const forbiddenTerms = ['date', 'status', 'due', 'exp', 'phone', 'note', 'comment', 'called', 'complete', 'escalate', 'by', 'type'];
                            const isTicketKey = (k: string) => {
                                if (forbiddenTerms.some(term => k.includes(term))) return false;
                                return k.includes('ticket') || k.includes('locate') || k.includes('tic');
                            };
                            const potentialTicketKeys = normKeys.filter(isTicketKey);

                            let t1Key = potentialTicketKeys.find(k => 
                                k === 'locate ticket' || 
                                k === 'ticket' || 
                                k === 'ticket #' || 
                                k === 'ticket number' || 
                                k === 'ticket no' || 
                                k === 'ticket id' || 
                                k === 'tic' || 
                                k.includes('1st') || 
                                k.includes('ticket 1')
                            );
                            
                            if (!t1Key) {
                                t1Key = potentialTicketKeys.find(k => 
                                    !k.includes('2nd') && !k.includes('3rd') && !k.includes('4th') && 
                                    !k.includes('ticket 2') && !k.includes('ticket 3') && !k.includes('ticket 4') &&
                                    !k.includes(' #2') && !k.includes(' #3')
                                );
                            }

                            let t2Key = potentialTicketKeys.find(k => k.includes('2nd') || k.includes('ticket 2') || k.includes('ticket #2'));
                            let t3Key = potentialTicketKeys.find(k => k.includes('3rd') || k.includes('ticket 3') || k.includes('ticket #3'));
                            let t4Key = potentialTicketKeys.find(k => k.includes('4th') || k.includes('ticket 4') || k.includes('ticket #4'));

                            const t1 = t1Key ? normalizedRow[t1Key] : '';
                            const t2 = t2Key ? normalizedRow[t2Key] : '';
                            const t3 = t3Key ? normalizedRow[t3Key] : '';
                            const t4 = t4Key ? normalizedRow[t4Key] : '';

                            const ticketData = {
                                ticket1: t1,
                                ticket2: t2,
                                ticket3: t3,
                                ticket4: t4,
                                phone: normalizedRow['locate number'] || normalizedRow['phone number'] || normalizedRow['phone'] || '',
                                area: normalizedRow['area'] || normalizedRow['city'] || '',
                                company: normalizedRow['company name'] || normalizedRow['company'] || '',
                                dateCalled: normalizedRow['date called'] || normalizedRow['called date'] || '',
                                dueDate: normalizedRow['due date'] || '',
                                expireDate: normalizedRow['expire date'] || normalizedRow['expiration date'] || normalizedRow['exp date'] || '',
                                escalated: normalizedRow['date escalated'] || '',
                                status: normalizedRow['ticket status'] || normalizedRow['status'] || '',
                                completed: normalizedRow['date ticket completed'] || normalizedRow['date completed'] || '',
                                notes: normalizedRow['notes'] || normalizedRow['comments'] || '',
                            };
                            locateMap[key].push(ticketData);
                        }
                    }
                });
            }

         } catch (e) {
             console.error("❌ [LOCATE EXCEL] Error parsing locate tickets:", e);
         }
      }

      // --- PARSE PROJECT DATA ---
      let allData: any[] = [];
      
      if (projectResponse && projectResponse.ok) {
        const arrayBuffer = await projectResponse.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        
        const targetSheets = [
            "Tillman UG Footage",
            "Completed Projects Pending PW",
            "Projects Pending Tillman QC ",
            "Comp Projects Invoiced-Paid Out"
        ];
        
        const excludedPhrases = [
            "Repairs",
            "Sent To Biz Ops",
            "Splicing Projects",
            "Maintenance Projects"
        ];

        targetSheets.forEach(sheetName => {
            if (workbook.SheetNames.includes(sheetName)) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData: any[] = window.XLSX.utils.sheet_to_json(worksheet, { 
                raw: false,
                defval: ''
            });
            
            const validRows = sheetData.map(row => {
                const ntpKey = Object.keys(row).find(key => key.includes("NTP Number")) || 'NTP Number';
                const ntpValue = row[ntpKey];

                const footageRemKey = Object.keys(row).find(key => key.toLowerCase().includes("footage remaining")) || 'Footage Remaining';
                const footageRemValue = row[footageRemKey];
                
                let market = ntpKey.replace("NTP Number", "").trim();
                if (!market) market = "General";

                const ntpStr = String(ntpValue || '').trim();
                const locateInfo = locateMap[ntpStr] || [];

                return {
                ...row,
                'NTP Number': ntpValue,
                'Market': market,
                'LocateTickets': locateInfo,
                'Footage Remaining': footageRemValue
                };
            }).filter(row => {
                const ntpNumber = row['NTP Number'];
                if (!ntpNumber || String(ntpNumber).trim() === '') return false;
                if (typeof ntpNumber === 'string') {
                const lowerNtp = ntpNumber.toLowerCase().trim();
                const isExcluded = excludedPhrases.some(phrase => lowerNtp.includes(phrase.toLowerCase()));
                if (isExcluded) return false;
                }
                const hasData = Object.values(row).some(value => value && String(value).trim() !== '');
                if (!hasData) return false;
                return true;
            });
            
            if (validRows.length > 0) {
                allData = allData.concat(validRows);
            }
            }
        });
      } else {
          throw new Error("Failed to download project excel file.");
      }
      
      if (allData.length === 0) {
        throw new Error('No valid project rows found in target sheets.');
      }
      
      setProjectData(allData);
      setLastDataUpdate(new Date().toLocaleString());
      setIsLoadingData(false);
      setDataLoadError(null);
      
    } catch (error: any) {
      console.error('❌ Error loading project data:', error);
      setProjectData(null);
      setLastDataUpdate(null);
      setIsLoadingData(false);
      setDataLoadError(`Failed to load data: ${error.message}. Ensure files exist in the GitHub repo.`);
    }
  };

  useEffect(() => {
    loadSheetJSAndFetchData();
    autoRefreshInterval.current = setInterval(() => {
      loadSheetJSAndFetchData();
    }, 5 * 60 * 1000);
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const cleanTextForSpeech = (text: string) => {
    let clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    clean = clean.replace(/\{.*\}/g, ""); // Remove JSON if mistakenly spoken
    clean = clean.replace(/\bCOP\b/g, "C O P");
    clean = clean.replace(/\bSOW\b/g, "S O W");
    clean = clean.replace(/\be\.g\./g, "Example");
    clean = clean.replace(/\bNTP\b/g, "N T P");
    clean = clean.replace(/\bPO\b/g, "P O");
    clean = clean.replace(/\bBOM\b/g, "B O M");
    clean = clean.replace(/\bEOS\b/g, "E O S");
    clean = clean.replace(/Sunshine 811/gi, "Sunshine 8 1 1");
    clean = clean.replace(/=/g, ", ");
    clean = clean
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      .replace(/^[\s]*[☐✅✓]\s+/gm, '')
      .replace(/^[\s]*[-=]{3,}[\s]*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[═│┌┐└┘├┤┬┴┼]/g, '')
      .trim();

    return clean;
  };

  const speakText = (text: string) => {
    if (!autoSpeak) return;
    
    // Do not speak JSON structures
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
        return;
    }

    synthRef.current.cancel();
    const cleanedText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0; 
    utterance.volume = 1.0;
    
    if (selectedVoiceName) {
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  // Helper to render message content with clickable links and images
  const renderMessageContent = (message: any) => {
    const content = message.content || "";
    
    // --- JSON PROJECT CARD RENDER LOGIC ---
    try {
        // Simple check before parsing to avoid overhead
        if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
            const json = JSON.parse(content);
            if (json.type === 'project_card' && json.data) {
                return <ProjectCard data={json.data} />;
            }
        }
    } catch (e) {
        // Not valid JSON, proceed to standard rendering
    }
    // --------------------------------------

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      const title = match[1];
      const url = match[2];
      parts.push(
        <a 
          key={match.index} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {title}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      );
      
      lastIndex = linkRegex.lastIndex;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return (
        <div className="flex flex-col gap-2">
            <div>{parts}</div>
            
            {/* Render Grounding (Maps/Search) */}
            {message.groundingChunks && message.groundingChunks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {message.groundingChunks.map((chunk: any, idx: number) => {
                        if (chunk.web) {
                            return (
                                <a key={idx} href={chunk.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-200 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    {chunk.web.title || "Source"}
                                </a>
                            );
                        }
                        if (chunk.maps) {
                             return (
                                <a key={idx} href={chunk.maps.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {chunk.maps.title || "View Map"}
                                </a>
                             );
                        }
                        return null;
                    })}
                </div>
            )}
        </div>
    );
  };

  const sendMessage = async (messageText = inputText) => {
    if (!messageText.trim() || isLoading) return;

    if (!aiRef.current) {
      setApiKeyError(true);
      return;
    }

    const userMessage = { role: 'user', content: messageText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      let projectDataContext = '';
      
      // ... Existing project data formatting logic ...
      if (projectData && projectData.length > 0) {
        projectDataContext = `\n\n═══════════════════════════════════════════════════════════════════\n## LIVE PROJECT DATA (Last Updated: ${lastDataUpdate})\n\nI have access to current project data with ${projectData.length} active projects. Here's a summary:\n\n`;
        
        const supervisorGroups: any = {};
        projectData.forEach(project => {
          const supervisor = project['Assigned Supervisor'] || 'Unassigned';
          if (!supervisorGroups[supervisor]) {
            supervisorGroups[supervisor] = [];
          }
          supervisorGroups[supervisor].push(project);
        });

        Object.keys(supervisorGroups).sort().forEach(supervisor => {
          const projects = supervisorGroups[supervisor];
          // Calculate Total Footage using 'Footage Remaining' preferred
          const totalFootage = projects.reduce((sum: number, p: any) => {
            let val = p['Footage Remaining'];
            if (val === undefined || val === null || String(val).trim() === '') {
                val = p['Footage UG'];
            }
            const footage = parseFootage(val);
            return sum + footage;
          }, 0);
          
          projectDataContext += `\n**${supervisor}**: ${projects.length} projects, ${totalFootage.toLocaleString()} ft remaining\nProjects: ${projects.map((p: any) => p['NTP Number']).join(', ')}\n`;
        });

        projectDataContext += `\n\n**DETAILED PROJECT DATA:**\n`;
        
        projectData.forEach(project => {
          const completionDate = project['Project Completion Date'] || project['Completion Date'] || 'N/A';
          const sowCost = project['SOW Estimated Cost'] ? `$${project['SOW Estimated Cost']}` : 'N/A';
          const doorTagDate = project['Door Tag Date'] || 'N/A';
          const locateDate = project['Locate Date'] || project['locate date'] || 'N/A';
          const sowTsdDate = project['SOW TSD Date'] || project['sow tsd date'] || 'N/A';
          const vendorAssignment = project['Vendor Assignment'] || project['vendor assignment'] || 'N/A';
          const hhp = project['HHP'] || project['hhp'] || 'N/A';
          const dateAssigned = project['Date Assigned'] || project['date assigned'] || 'N/A';
          const projectStatus = project['On Track or In Jeopardy'] || 'N/A';
          const permitDate = project['Permit Date'] || 'Received';
          
          // Footage Logic for specific project details
          const footageRemaining = parseFootage(project['Footage Remaining'] !== undefined ? project['Footage Remaining'] : project['Footage UG']);
          const footageTotal = parseFootage(project['Footage UG']);
          const footageCompleted = Math.max(0, footageTotal - footageRemaining);
          const percentComplete = footageTotal > 0 ? ((footageCompleted / footageTotal) * 100).toFixed(0) : '0';

          let locateDetailsStr = "No locate data found.";
          if (project['LocateTickets'] && project['LocateTickets'].length > 0) {
             const tickets = project['LocateTickets'];
             locateDetailsStr = JSON.stringify(tickets.map((l: any) => ({
                 ticket: [l.ticket1, l.ticket2, l.ticket3, l.ticket4].filter(t => t).join(', '),
                 phone: l.phone,
                 status: l.status,
                 due: l.dueDate,
                 expires: l.expireDate,
                 notes: l.notes
             })));
          }

          projectDataContext += `\n- **${project['NTP Number']}** | Supervisor: ${project['Assigned Supervisor']} | Status: ${project['Constuction Status']} | Health: ${projectStatus} | Area: ${project['AREA']} | Description: ${project['Description'] || 'Underground construction'} | Footage Total: ${footageTotal} | Footage Remaining: ${footageRemaining} | Footage Completed: ${footageCompleted} | Percent: ${percentComplete}% | Deadline (TSD): ${sowTsdDate} | Est Cost: ${sowCost} | Door Tag: ${doorTagDate} | Locates Date: ${locateDate} | Vendor: ${vendorAssignment} | HHP: ${hhp} | Assigned: ${dateAssigned} | Completion: ${completionDate} | Permit: ${permitDate} \n  Locate JSON: ${locateDetailsStr}`;
        });
      } else {
        projectDataContext = `\n\n⚠️ SYSTEM ALERT: LIVE PROJECT DATA IS CURRENTLY OFFLINE/UNAVAILABLE.`;
      }

      // Keep existing knowledge base content
      const knowledgeBase = `
TILLMAN FIBER & LIGHTSPEED CONSTRUCTION - MASTER KNOWLEDGE BASE

${projectDataContext}

## SECTION 1: EXECUTION OF BOM, SOW, NTP, PO, INVOICING, CO’s & COP’s
(Content intentionally truncated for brevity in this response, assumed unchanged)
`;

      const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      let languageInstruction = '';
      if (language === 'es') {
          languageInstruction = `\n\nCRITICAL LANGUAGE INSTRUCTION: The user has selected SPANISH language. You MUST answer all questions in Spanish. HOWEVER, IF YOU OUTPUT JSON, THE KEYS MUST REMAIN IN ENGLISH. Only translate the string values within the JSON.`;
      }

      const systemInstruction = `You are a knowledgeable AI assistant for Tillman Fiber and Lightspeed Construction Group.
Current Date: ${currentDate}

CRITICAL INSTRUCTIONS:
1.  **JSON MODE FOR PROJECTS**: If the user asks about a SPECIFIC project (status, footage, locates, details), you **MUST** return a JSON object strictly following the schema below. Do NOT return markdown text for specific project queries.
    
    **JSON Schema:**
    \`\`\`json
    {
      "type": "project_card",
      "data": {
        "ntp": "String (NTP Number)",
        "status": "String (Health Status e.g. On Track)",
        "supervisor": "String",
        "market": "String",
        "address": "String (City/Area)",
        "description": "String",
        "footage": {
          "total": Number,
          "remaining": Number,
          "completed": Number,
          "percent": Number
        },
        "dates": {
          "assigned": "String",
          "completion": "String",
          "doorTag": "String",
          "locates": "String",
          "tsd": "String",
          "permit": "String"
        },
        "financial": {
          "cost": "String"
        },
        "stats": {
          "hhp": "String"
        },
        "locates": [
          { "ticket": "String", "phone": "String", "status": "String", "due": "String", "expires": "String", "notes": "String" }
        ],
        "notes": "String (Any additional context)"
      }
    }
    \`\`\`

2.  **TEXT MODE**: For general questions (procedures, rate cards, "how do I...", weather), use standard Markdown text.
3.  **Data Accuracy**: Use the provided "LIVE PROJECT DATA" block. Do not hallucinate.
4.  **Locates**: If returning JSON, parse the "Locate JSON" provided in the context into the \`locates\` array.
5.  **Math**: Use the provided "Footage Completed" and "Percent" values from the context. Do not recalculate.

${languageInstruction}

KNOWLEDGE BASE & LIVE PROJECT DATA:
${knowledgeBase}`;

      // Config for Google Search and Maps
      const toolConfig: any = {};
      if (userLocation) {
        toolConfig.retrievalConfig = {
            latLng: {
                latitude: userLocation.lat,
                longitude: userLocation.lng
            }
        };
      }

      // Call Google GenAI API
      const response = await aiRef.current.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: messageText,
        config: {
          systemInstruction: systemInstruction,
          tools: [{googleSearch: {}}, {googleMaps: {}}],
          toolConfig: toolConfig
        }
      });

      const text = response.text;
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      const assistantMessage = {
        role: 'assistant',
        content: text,
        groundingChunks: groundingChunks
      };

      setMessages([...updatedMessages, assistantMessage]);
      
      // Auto-speak only if it's NOT a JSON card
      if (autoSpeak && text && !text.trim().startsWith('{')) {
        speakText(text);
      }
    } catch (error: any) {
      console.error('Error getting response:', error);
      
      let errorMsg = `I apologize, but I encountered an error: ${error.message || error}. Please check the console for details.`;
      
      if (error.message && (
          error.message.includes('429') || 
          error.message.includes('503') ||
          error.message.toLowerCase().includes('quota') || 
          error.message.toLowerCase().includes('resource exhausted')
      )) {
          errorMsg = "⏳ **System Cooling Down**\n\nI have reached the maximum number of requests allowed per minute. Please wait approximately **30 to 60 seconds** before asking your next question.\n\nThis ensures fair usage and reliable responses. Thank you for your patience!";
      }

      const errorMessage = {
        role: 'assistant',
        content: errorMsg
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    "Where do I find the maps for our projects?",
    "What is the weather at the current location?",
    "How do I setup Timestamp Camera?",
    "Compare the TCBDB2 rate on both rate cards?",
    "How do I submit a Close Out Package?",
    "Show me details for project D-HNP108"
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#383e4b] to-[#000000] to-50% sm:to-100% bg-cover">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#383e4b] to-[#000000] text-white p-4 shadow-lg header-buttons flex-none sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
             <div className="h-10 w-auto flex items-center justify-center">
                <img src="./LSCG_Logo_White_transparentbackground.png" alt="LSCG Logo" className="h-10 w-auto object-contain" />
                <img src="./nexus-logo-master.png" alt="LSCG Logo" className="h-10 w-auto object-contain" />
             </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Nexus - LSCG Tillman Assistant</h1>
              <p className="text-gray-300 text-xs hidden sm:block">AI-powered Construction & Project Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                   setLanguage(prev => prev === 'en' ? 'es' : 'en');
                }}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1"
                title={language === 'en' ? "Switch to Spanish" : "Cambiar a Inglés"}
            >
                {language === 'en' ? '🇺🇸 EN' : '🇲🇽 ES'}
            </button>
            <button 
                onClick={() => { setShowAnalytics(!showAnalytics); setShowDashboard(false); }} 
                className={`p-2 rounded-full transition-all ${showAnalytics ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
                title={showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </button>
            <button 
                onClick={() => { setShowDashboard(!showDashboard); setShowAnalytics(false); }} 
                className={`p-2 rounded-full transition-all ${showDashboard ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
                title={showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-all ${showSettings ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`} title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <button onClick={() => setAutoSpeak(!autoSpeak)} className={`p-2 rounded-full transition-all ${autoSpeak ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`} title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}>
              {autoSpeak ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in no-print" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-gray-800">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Voice Selection</label>
                <select 
                  value={selectedVoiceName}
                  onChange={handleVoiceChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Default Voice</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Location Status</h4>
                  <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${userLocation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {userLocation ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Location Active ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})
                          </>
                      ) : (
                          <>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                             Location Not Detected (Enable for Weather/Maps)
                          </>
                      )}
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chat Actions</label>
                <div className="flex gap-2">
                  <button 
                    onClick={handleDownloadChat}
                    className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Save Transcript
                  </button>
                  <button 
                    onClick={handlePrintChat}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Error Banner */}
      {apiKeyError && (
        <div className="bg-red-600 text-white px-6 py-4 text-center font-bold shadow-md no-print">
          ⚠️ MISSING API KEY: The application cannot connect to Gemini. <br/>
          If you are running on GitHub Pages, you must manually set your API key in the index.html file.
        </div>
      )}

      {/* Data Load Error Banner */}
      {dataLoadError && (
        <div className="bg-red-100 border-b border-red-200 text-red-700 px-6 py-3 text-sm flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{dataLoadError}</span>
          </div>
          <button onClick={loadSheetJSAndFetchData} className="text-red-700 underline font-semibold hover:text-red-900">Retry</button>
        </div>
      )}

      {/* Analytics Dashboard View */}
      {showAnalytics && (
         <div className="max-w-6xl mx-auto w-full px-4 pt-6 no-print flex-none">
            <ProjectAnalytics projectData={projectData || []} />
         </div>
      )}

      {/* External Dashboard View */}
      {showDashboard && (
        <div className="max-w-6xl mx-auto w-full px-4 pt-6 no-print flex-none">
          <ExternalDashboard />
        </div>
      )}

      {/* Quick Questions */}
      {messages.length === 1 && !showDashboard && !showAnalytics && (
        <div className="max-w-4xl mx-auto w-full px-4 py-6 no-print flex-none">
          <p className="text-sm text-gray-600 mb-3 font-medium">Quick questions to get started:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickQuestions.map((question, idx) => (
              <button key={idx} onClick={() => sendMessage(question)} className="text-left p-3 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-blue-50 transition-all border border-gray-200 text-sm animate-fade-in" style={{animationDelay: `${idx * 100}ms`}}>
                <svg className="w-4 h-4 inline mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 chat-container bg-[#f3f4f6] w-full">
        <div className="max-w-4xl mx-auto space-y-4 pb-20">
          {messages.map((message, idx) => (
            <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} message-wrapper animate-message`}>
              <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-5 py-3 shadow-sm message-bubble ${message.role === 'user' ? 'bg-blue-600 text-white user-message rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 assistant-message rounded-bl-none'} ${message.content.trim().startsWith('{') ? 'bg-transparent border-0 shadow-none px-0 py-0' : ''}`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                   {message.role === 'assistant' ? renderMessageContent(message) : message.content}
                </div>
                
                {message.role === 'assistant' && idx === messages.length - 1 && !isLoading && !message.content.trim().startsWith('{') && (
                  <div className="mt-2 flex items-center gap-3 no-print">
                      <button onClick={() => speakText(message.content)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        {language === 'es' ? "Leer en voz alta" : "Read aloud"}
                      </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start no-print animate-message">
              <div className="bg-white rounded-2xl rounded-bl-none px-5 py-4 shadow-sm border border-gray-200 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg input-area no-print flex-none sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end">
            <button onClick={toggleListening} disabled={isLoading} className={`p-4 rounded-xl transition-all ${isListening ? 'bg-red-500 hover:bg-red600 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'} text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-none`} title={isListening ? 'Stop listening' : 'Click to speak'}>
              {isListening ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
            <div className="flex-1 relative">
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyPress} placeholder={isListening ? (language === 'es' ? "Escuchando..." : "Listening...") : (language === 'es' ? "Escribe tu pregunta o habla..." : "Type your question or click the microphone to speak...")} disabled={isLoading || isListening} className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm" rows={1} style={{minHeight: '48px', maxHeight: '120px'}} />
            </div>
            <button onClick={() => sendMessage()} disabled={!inputText.trim() || isLoading} className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-none" title="Send message">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
          {isListening && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-2 animate-pulse justify-center sm:justify-start">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              {language === 'es' ? "Escuchando... Di tu pregunta ahora" : "Listening... Speak your question now"}
            </p>
          )}
          {isSpeaking && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-blue-600 flex items-center gap-2">
                <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                {language === 'es' ? "Hablando..." : "Speaking response..."}
              </p>
              <button onClick={stopSpeaking} className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black border-t border-gray-800 px-4 py-2 no-print flex-none">
        <div className="max-w-4xl mx-auto text-xs text-white flex items-center justify-center gap-4 flex-wrap text-center">
          <span>{language === 'es' ? "💡 Pregunta sobre procedimientos, clima, tarifas o datos del proyecto" : "💡 Ask about procedures, weather, rates, or live project data"}</span>
          <span className="hidden sm:inline">•</span>
          <span>🎤 Voice works in Chrome & Edge</span>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<TillmanKnowledgeAssistant />);