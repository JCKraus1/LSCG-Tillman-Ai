import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  MapPin, Calendar, User, Clock, CheckCircle, 
  Truck, Play, AlertCircle, Edit2, Save, X, Activity, HardHat,
  Navigation, Camera, Image as ImageIcon, Trash2, StickyNote, ArrowLeft
} from 'lucide-react';

// Define window interfaces for external libraries and APIs
declare global {
  interface Window {
    XLSX: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    L: any;
  }
}

// Helper to safely parse footage numbers
const parseFootage = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const str = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// --- Sub-components for Project Details ---
const DetailItem = ({ label, value }: { label: string, value?: string }) => {
  if (!value || value === 'N/A' || value === 'Unknown' || value === '') return null;
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{label}</span>
      <span className="text-sm text-slate-800 font-semibold whitespace-pre-wrap">{value}</span>
    </div>
  );
};

const ProjectInfoCard = ({ project }: { project: any }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !leafletMap.current && window.L) {
      setTimeout(() => {
        // Default to a generic Florida location if no specific lat/lng (common for this data)
        const lat = 27.9506;
        const lng = -82.4572;
        
        leafletMap.current = window.L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([lat, lng], 10);
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap.current);

        window.L.marker([lat, lng]).addTo(leafletMap.current)
          .bindPopup(`<b>${project['NTP Number']}</b><br>${project['AREA'] || 'Location'}`)
          .openPopup();
      }, 100);
    }
  }, [project]);

  const footageUG = parseFootage(project['Footage UG']);
  const footageRem = parseFootage(project['Footage Remaining']);
  const footageCompleted = footageUG - footageRem;
  const progressPercent = footageUG > 0 ? Math.min(100, Math.max(0, Math.round((footageCompleted / footageUG) * 100))) : 0;

  const getStatusColor = (status: string) => {
    const s = String(status).toLowerCase();
    if (s.includes('complete')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('progress') || s.includes('started')) return 'bg-amber-100 text-amber-800';
    if (s.includes('track')) return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-w-2xl w-full animate-fade-in no-print">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{project['NTP Number']}</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(project['Constuction Status'])}`}>
               {project['Constuction Status'] || 'Pending'}
             </span>
             <span className="text-slate-400 text-xs">|</span>
             <span className="text-slate-500 text-xs font-mono">SUP: {project['Assigned Supervisor'] || 'TBD'}</span>
          </div>
        </div>
        <button 
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(project['AREA'] || 'Florida')}`, '_blank')}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
        >
          <Navigation size={16} />
          <span className="text-xs font-bold">Nav</span>
        </button>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="h-32 w-full bg-slate-100 relative grayscale-[0.5]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
           {!window.L && <span className="text-slate-400 text-xs">Loading Map...</span>}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Project Data Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
           <DetailItem label="Permit Status" value={project['Constuction Status']} />
           <DetailItem label="Area" value={project['AREA']} />
           <DetailItem label="Deadline (TSD)" value={project['SOW TSD Date']} />
           <DetailItem label="Est. Cost" value={project['SOW Estimated Cost'] ? `$${project['SOW Estimated Cost']}` : undefined} />
           <DetailItem label="Door Tag" value={project['Door Tag Date']} />
           <DetailItem label="Locates" value={project['Locate Date']} />
           <DetailItem label="Households (SA)" value={project['HHP']} />
           <DetailItem label="Date Assigned" value={project['Date Assigned']} />
           <DetailItem label="Completion Date" value={project['Project Completion Date']} />
        </div>

        {/* Production Target */}
        <div className="pt-4 border-t border-slate-100">
           <div className="flex justify-between items-end mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Activity size={14} className="text-blue-600" /> Production Target
              </h3>
              <span className="text-sm font-bold text-slate-700">{progressPercent}% Complete</span>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${progressPercent}%` }}
              ></div>
           </div>
           <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-2 bg-slate-50 rounded-lg text-center border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Target Footage</p>
                <p className="text-sm font-bold text-slate-800">{footageUG.toLocaleString()} ft</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-center border border-emerald-100">
                <p className="text-[10px] text-emerald-600 uppercase font-bold">Remaining</p>
                <p className="text-sm font-bold text-emerald-700">{footageRem.toLocaleString()} ft</p>
              </div>
           </div>
        </div>

        {/* Notes/Locates */}
        <div className="pt-4 border-t border-slate-100">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <StickyNote size={14} className="text-amber-500" /> Project Locate Tickets
           </h3>
           <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-100 leading-relaxed max-h-32 overflow-y-auto">
              {project['LocateTickets'] && project['LocateTickets'].length > 0 ? (
                <div className="mb-2 space-y-1">
                  {project['LocateTickets'].map((l: any, idx: number) => (
                    <div key={idx} className="border-b border-amber-200 pb-1 mb-1 last:border-0">
                      <span className="font-bold text-amber-800">Tickets:</span> {l.ticket1} {l.ticket2} | <span className="font-bold text-amber-800">Phone:</span> {l.phone} | <span className="font-bold text-amber-800">Due:</span> {l.dueDate} | <span className="font-bold text-amber-800">Expire:</span> {l.expireDate}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="italic text-slate-400">No active locate tickets found in tracker.</p>
              )}
              {project['notes'] && <p className="mt-2">{project['notes']}</p>}
           </div>
        </div>
      </div>
    </div>
  );
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
            
            console.log("📂 [LOCATE EXCEL] Workbook Loaded");
            console.log("📑 [LOCATE EXCEL] Available Sheets:", locateWorkbook.SheetNames);

            // Try to find a sheet with "master" in name, otherwise default to first sheet
            let locateSheetName = locateWorkbook.SheetNames.find((name: string) => 
                name.toLowerCase().includes('master')
            );
            
            if (!locateSheetName && locateWorkbook.SheetNames.length > 0) {
                 locateSheetName = locateWorkbook.SheetNames[0];
                 console.warn(`⚠️ [LOCATE EXCEL] "Master" sheet not found. Defaulting to first sheet: "${locateSheetName}"`);
            }
            
            if (locateSheetName) {
                const locateSheet = locateWorkbook.Sheets[locateSheetName];
                const locateRawData: any[] = window.XLSX.utils.sheet_to_json(locateSheet, { 
                    raw: false, 
                    defval: '',
                    blankrows: false 
                });
                
                console.log(`📊 [LOCATE EXCEL] Processing Sheet: "${locateSheetName}" | Total Rows Found: ${locateRawData.length}`);

                let mappedCount = 0;
                locateRawData.forEach((row, index) => {
                    const normalizedRow: any = {};
                    Object.keys(row).forEach(k => {
                        normalizedRow[k.trim().toLowerCase()] = row[k];
                    });
                    
                    // Robust Key Finding for Map/Project Number
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
                            mappedCount++;
                            
                            const normKeys = Object.keys(normalizedRow);
                            
                            // Terms that indicate this is NOT the ticket number column
                            const forbiddenTerms = ['date', 'status', 'due', 'exp', 'phone', 'note', 'comment', 'called', 'complete', 'escalate', 'by', 'type'];
                            
                            // Helper to determine if a key is potentially a ticket number column
                            const isTicketKey = (k: string) => {
                                if (forbiddenTerms.some(term => k.includes(term))) return false;
                                return k.includes('ticket') || k.includes('locate') || k.includes('tic');
                            };

                            // Find all potential ticket columns
                            const potentialTicketKeys = normKeys.filter(isTicketKey);

                            // --- TICKET 1 SEARCH ---
                            // Strict matches first
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
                            
                            // Fallback: Use the first potential key that doesn't imply 2nd, 3rd, or 4th
                            if (!t1Key) {
                                t1Key = potentialTicketKeys.find(k => 
                                    !k.includes('2nd') && !k.includes('3rd') && !k.includes('4th') && 
                                    !k.includes('ticket 2') && !k.includes('ticket 3') && !k.includes('ticket 4') &&
                                    !k.includes(' #2') && !k.includes(' #3')
                                );
                            }

                            // --- TICKET 2 SEARCH ---
                            let t2Key = potentialTicketKeys.find(k => k.includes('2nd') || k.includes('ticket 2') || k.includes('ticket #2'));
                            
                            // --- TICKET 3 SEARCH ---
                            let t3Key = potentialTicketKeys.find(k => k.includes('3rd') || k.includes('ticket 3') || k.includes('ticket #3'));
                            
                            // --- TICKET 4 SEARCH ---
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
                                // NOTE: We explicitly DO NOT include footage from locate sheet to avoid calculations errors.
                                notes: normalizedRow['notes'] || normalizedRow['comments'] || '',
                            };
                            locateMap[key].push(ticketData);
                        }
                    }
                });
                console.log(`✅ [LOCATE EXCEL] Successfully mapped ${mappedCount} locate entries to Project IDs.`);
            }

         } catch (e) {
             console.error("❌ [LOCATE EXCEL] Error parsing locate tickets:", e);
         }
      } else {
        console.warn("❌ [LOCATE EXCEL] Failed to download locate-tickets.xlsx");
      }

      // --- PARSE PROJECT DATA ---
      let allData: any[] = [];
      
      if (projectResponse && projectResponse.ok) {
        const arrayBuffer = await projectResponse.arrayBuffer();
        
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        console.log("📂 [PROJECT EXCEL] Workbook Loaded");
        console.log("📑 [PROJECT EXCEL] Available Sheets:", workbook.SheetNames);
        
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
            
            console.log(`🔹 [PROJECT EXCEL] Reading Sheet "${sheetName}" | Rows: ${sheetData.length}`);
            
            const validRows = sheetData.map(row => {
                const ntpKey = Object.keys(row).find(key => key.includes("NTP Number")) || 'NTP Number';
                const ntpValue = row[ntpKey];

                // Find Footage Remaining specifically (Case insensitive search)
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
                'Footage Remaining': footageRemValue // Store explicit Footage Remaining column
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
                console.log(`   -> Added ${validRows.length} valid projects from "${sheetName}"`);
            } else {
                console.log(`   -> No valid project rows found in "${sheetName}"`);
            }
            } else {
                console.warn(`⚠️ [PROJECT EXCEL] Target sheet "${sheetName}" NOT found.`);
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
      console.log('✅ [COMPLETE] Project data loaded successfully:', allData.length, 'total active projects');
      
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
    // Basic cleanup logic remains
    let clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
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
            
            {/* NEW: Render Project Info Card if a specific project was detected in context */}
            {message.projectContext && (
              <ProjectInfoCard project={message.projectContext} />
            )}

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
      // 1. PROJECT DETECTION ENGINE
      let matchedProject = null;
      if (projectData) {
        const found = projectData.find(p => messageText.toUpperCase().includes(String(p['NTP Number']).toUpperCase()));
        if (found) matchedProject = found;
      }

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
          
          // Footage Logic for specific project details
          const footageRemaining = project['Footage Remaining'] !== undefined ? project['Footage Remaining'] : project['Footage UG'];

          let locateDetailsStr = "No locate data found.";
          if (project['LocateTickets'] && project['LocateTickets'].length > 0) {
             const tickets = project['LocateTickets'];
             locateDetailsStr = tickets.map((l: any, idx: number) => {
                 const ticketNums = [l.ticket1, l.ticket2, l.ticket3, l.ticket4]
                    .filter(t => t !== undefined && t !== null && String(t).trim() !== '')
                    .join(', ');
                 const fields = [];
                 // Removed brackets [] from ticket numbers display
                 if (ticketNums) fields.push(`Tickets: ${ticketNums}`);
                 if (l.phone && String(l.phone).trim() !== '') fields.push(`Phone: ${l.phone}`);
                 if (l.status && String(l.status).trim() !== '') fields.push(`Status: ${l.status}`);
                 if (l.dueDate && String(l.dueDate).trim() !== '') fields.push(`Due: ${l.dueDate}`);
                 if (l.expireDate && String(l.expireDate).trim() !== '') fields.push(`Expires: ${l.expireDate}`);
                 if (l.area && String(l.area).trim() !== '') fields.push(`Area: ${l.area}`);
                 if (l.company && String(l.company).trim() !== '') fields.push(`Company: ${l.company}`);
                 if (l.notes && String(l.notes).trim() !== '') fields.push(`Notes: ${l.notes}`);
                 return `Entry ${idx + 1}: ${fields.join(', ')}`;
             }).join('\n');
          }

          projectDataContext += `\n- **${project['NTP Number']}** | Supervisor: ${project['Assigned Supervisor']} | Status: ${project['Constuction Status']} | Health: ${projectStatus} | Area: ${project['AREA']} | Footage Remaining: ${footageRemaining} | Complete: ${project['UG Percentage Complete']} | Deadline (TSD): ${sowTsdDate} | Est Cost: ${sowCost} | Door Tag: ${doorTagDate} | Locates: ${locateDate} | Vendor: ${vendorAssignment} | HHP (SAs): ${hhp} | Assigned: ${dateAssigned} | Completion: ${completionDate} \n  Locate Tickets:\n${locateDetailsStr}`;
        });
      } else {
        projectDataContext = `\n\n⚠️ SYSTEM ALERT: LIVE PROJECT DATA IS CURRENTLY OFFLINE/UNAVAILABLE. \nYou DO NOT have access to any project statuses, supervisors, or footage. \nIf the user asks about a specific project, you MUST state that live data is currently unavailable and refer them to the supervisor.`;
      }

      // Master Knowledge Base logic...
      const knowledgeBase = `
TILLMAN FIBER & LIGHTSPEED CONSTRUCTION - MASTER KNOWLEDGE BASE

${projectDataContext}

## SECTION 1: EXECUTION OF BOM, SOW, NTP, PO, INVOICING, CO’s & COP’s

### BILL OF MATERIALS (BOM) & SCOPE OF WORK (SOW)
*   **Creation**: Engineering Vendor creates BOM/SOW in Sitetracker. Line items initiated by Engineering Vendor, reviewed by TFC QC Design Engineer.
*   **Template**: Vendors must select the correct template for the Job Type.
*   **Approvals**: Engineering Vendor submits -> TFC QC Design Engineer reviews and approves.
*   **Common Mistakes**: BOM totals not matching Design Drawings; Incorrect Microduct/conduit counts; Incorrect Material scoping; Lacking detailed summary on front page of Design Drawings.

### NOTICE TO PROCEED (NTP)
*   **Definition**: Official authorization for the construction vendor to begin work. Issued only after "Release to Construction" (RTC) status.
*   **Process**: Construction Project Coordinator (PC) assembles NTP package (Design, BOM, Permits, ABF). Zips and uploads to Sitetracker Files. Notifies Vendor.
*   **Timeline**: Vendor must access NTP package and submit Purchase Order (PO) request in Sitetracker within **3 days**.
*   **Construction Window**: NTP actualization triggers the **45-day** construction timeline.
*   **Package Contents**: Permits, Construction Design (CD), BOM, As-Built Fiber (ABF).

### PURCHASE ORDERS (PO) & INVOICING
*   **PO Process**: Vendor receives NTP -> Vendor submits PO in Sitetracker (within 3 days) -> Vendor approves PO.
*   **Invoicing Phase 1**: Vendor completes Phase 1 construction -> Requests QC Inspection -> Passes QC -> Submits Phase 1 Invoice (within 2 days of QC).
*   **Invoicing Phase 2**: Vendor completes Phase 2 -> Requests QC -> Uploads Closeout Package (COP) -> Submits Phase 2 Invoice (within 5 days of completion).
*   **Approval**: Construction PM reviews and approves invoices. Finance team validates integration to NetSuite.
*   **True Up**: Like-for-like adjustments (variance ≤ 5%). Vendor submits True Up BOM/SOW -> PM approves -> System generates PO -> Vendor submits Invoice.
*   **Change Order (CO)**: Scope additions or changes > 5%. Vendor submits CO Request Form -> Senior CM approves -> Vendor initiates PO/Invoice.

### CLOSE OUT PACKAGE (COP)
*   **Importance**: Final proof project is built to standard. Required for payment.
*   **Submission**: Vendor uploads COP to Sitetracker Files (Category: 'Closeout').
*   **Naming Convention**: 'Job Number_Document Name_COP'
*   **Critical Step**: Vendor MUST actualize the "Closeout Package Submission" date in Sitetracker. Without this date, the project will not move to payment.
*   **Required Documentation**:
    1.  **Redlines (As-Builts)**: Final marked-up drawings. Must show correct conduit footage, GIS locations (decimal format) for all assets (FX4, Vaults, Toby boxes, etc.), sequential fiber footage, cable manufacturer, offsets from EOP/BOC.
    2.  **Bore Logs**: Records of all bores. Must include Start Point, Footage, Depth, Offsets, Handhole # and Stationing.
    3.  **Photos**: Before/After photos of area, FX4 (pad, conduits, placement), Vaults (open/closed, gravel, ground rod, locate wire, splice case, coil, marker ball), Toby Boxes (open/closed).
    4.  **ABF Verification Form**: Hexatronic form completed in Excel. Must match photo addresses.
    5.  **BOM**: Actual materials used.
    6.  **Splice Results**: OTDR and ILM test results (PDF) + splice case photos.
    7.  **Tillman QC Sign-Off**: Signed TFC Construction Compliance Checklist.
    8.  **GPS As-Builts**: 1-foot accuracy.
    9.  **Permits/Inspections**: Copies of all permits and closed inspections.

### TIMELINES & SLAs
*   **Construction Start**: Within 30 days of NTP.
*   **Restoration**: 7-Day Restoration Policy (Mandatory). Complete restoration within 7 days of project completion.
*   **COP Submission**: Within 5 days of restoration completion.
*   **QC Inspection Request**: Within 2 business days of phase completion.
*   **Invoice Review**: 2 days for PM review.

## SECTION 2: OSP ENGINEERING STANDARDS

### ARCHITECTURE
*   **Backbone/Feeder**: Traditional ribbon fiber tying Remote OLTs in ring configuration. Exclusively using FX4 solution (SF8/FX8 no longer used for design).
*   **Distribution**:
    *   **SFU**: 1st choice: Hexatronic Micro duct solution (buried). 2nd choice: Corning FlexNap (Distributive Split 1x8 to 1x4).
    *   **MDU**: Garden Style = Hexatronic. Mid/High Rise = Corning MDU suite.
*   **OLT Specs**: 50k HHP per Aggregation Router. FX-4 max HHP 6000.
*   **Splitting**: Centralized Split (1x32 at FDH). FX4 OLT split is 1x2.

### CONSTRUCTION & INSTALLATION
*   **Depth of Burial**: Minimum 24" for DA Fiber. 36" for underground distribution multiduct. 
*   **Conduit**:
    *   Path along one side of roadway with 1.5" duct.
    *   Every major road crossing: Additional 1.5" conduit between vaults.
    *   Toby Box: Max 4 addresses served.
*   **Handholes**:
    *   Mount flush to earth. 5-6" crushed rock base.
    *   **30x48x36**: At FX4 locations.
    *   **24x36x24**: Backbone/Feeder environments or every 1000', 90-degree turns, major road crossings.
    *   **17x30x24**: Larger distribution fibers, splice points, laterals.
    *   **13x24x18**: G-5 terminal closure.
    *   **Toby Box**: 8.43 x 11.85 inches for micro ducts.
*   **Locate Wire**: #12AWG Copperhead Tracer Wire.
*   **Marker Balls**: Place in every handhole with a splice in Feeder Route, all FDH locations, and Branch DAPs.
*   **Coil Loops**:
    *   80' loop: Pass through (no future splice).
    *   100' loop: Future splice, MDU, intersections, major road crossings.
    *   50' loop: Terminal locations, 90-degree change of direction.

### FIBER & SPLICING
*   **Fiber Types**: 288/144 Ribbon, 96/48 Loose Tube.
*   **Splicing**: Fusion splicing required. 0.05 dB max loss per splice.
*   **Testing**: Bi-directional OTDR at 1310nm and 1550nm.
*   **Stingray**: Used to link multiple 96-FDH together (Daisy Chain). 1-9 fibers = 12F Stingray; 10+ fibers = 24F Stingray. Max 90 homes per Hexatronic 96-FDH.

### GROUNDING
*   **Ring**: 2 AWG solid tinned copper wire.
*   **Rods**: Min 8' length, 5/8" diameter. Min 2 rods per pad.
*   **Connections**: Exothermic welds (Cadweld) for ground ring.

## SECTION 3: ROLES & RESPONSIBILITIES
*   **Construction Project Coordinator (CX PC)**: Assemble NTP package, send NTP email, coordinate with vendors.
*   **Construction Vendor**: Access NTP, submit PO, execute work, request QC, submit Invoices/COP.
*   **Engineering Vendor**: Design project, create BOM/SOW, generate PO records.
*   **TFC QC Design Engineer**: Performs QC on design, SOW/BOM (One-pass quality check).
*   **Construction PM**: Review invoice requests, validate work alignment, approve/deny.

## SECTION 4: SAFETY
*   **PPE**: Hard hat, safety vest, steel-toed boots, glasses/goggles required.
*   **Digging**: Pothole/hand dig underground path before boring.
*   **Traffic Control**: MOT permits required on-site.

## SECTION 5: GLOSSARY TERMS
*   **NTP Number**: The Project Name/Number used in the Excel sheet (Column A).
*   **FDH**: Fiber Distribution Hub.
*   **DAP**: Duct Access Point (2x4x3 bore pit).
*   **FX4**: Nokia OLT Cabinet.
*   **ABF**: Air Blown Fiber.
*   **COP**: Closeout Package.
*   **GIG**: Good to Go / Growth Inhibiting Gaps (deficiencies).

## SECTION 6A: TILLMAN FIBER STANDARD RATE CARD (Construction v1.1)
*   **Aerial**:
    *   TCA1 Place Aerial - Strand 6M to 6.6M: $1.10/FT
    *   TCA1A Place Aerial-Anchor and Rod-Mechanical: $75.00/EA
    *   TCA1B Place Aerial-Anchor and Rod-Hand-Dig: $75.00/EA
    *   TCA2 Place Aerial - Stand 10M to 25M: $1.30/FT
    *   TCA3 Place Aerial - Self-support fiber: $1.36/FT
    *   TCA4 Place Aerial - Self-support flexible duct: $1.55/FT
    *   TCA5 Place Aerial - Total Bundle for route < 2500': $2.00/FT
    *   TCA6 Place Aerial - Total Bundle for route >5000': $1.90/FT
    *   TCA7 Place Aerial - Total Bundle for route < 5000': $1.80/FT
    
*   **Buried - Directional Bore**:
    *   TCBDB2 Place Buried - directional bore - standard – up to 4.0” outside diameter bundle: $10.00/FT
    *   TCBDB4 Place Buried - directional bore - standard - over 4.0" to 7.0" outside diameter bundle: $14.00/FT
    *   TCBDB8 Place Buried - directional bore - rock - up to 4.0” outside diameter bundle: $25.00/FT
    *   TCBDB9 Place Buried - directional bore - rock - over 4.0" to 7.0" outside diameter bundle: $29.00/FT

*   **Buried - Hand Dig**:
    *   TCBHD1 Place Buried - 6" cover - hand dig: $4.50/FT
    *   TCBHD2 Place Buried - 7" through 12" cover - hand dig: $5.50/FT
    *   TCBHD3 Place Buried - 12" through 18" cover - hand dig: $6.50/FT
    *   TCBHD4 Place Buried - 19" through 24" cover - hand dig: $7.50/FT
    *   TCBHD5 Place Buried - 25" through 36" cover - hand dig: $8.50/FT
    *   TCBHD6 Place Buried - 37" through 48" cover - hand dig: $11.00/FT
    *   TCBHD7 Place Buried - add'l depth in 6" increments - hand dig: $1.25/FT

*   **Buried - Missile Bore**:
    *   TCBMB1 Place Buried - missile bore - up to 4.0" outside diameter bundle: $9.00/FT
    *   TCBMB2 Place Buried - missile bore - over 4.0" to 7.0" outside diameter bundle: $12.50/FT

*   **Buried - Mechanical**:
    *   TCBP1 Place Buried - 6" cover - mechanical: $4.25/FT
    *   TCBP2 Place Buried - 7" through 12" cover - mechanical: $4.40/FT
    *   TCBP3 Place Buried - 12" through 18" cover - mechanical: $4.55/FT
    *   TCBP4 Place Buried - 19" through 24" cover - mechanical: $5.00/FT
    *   TCBP5 Place Buried - 25" through 36" cover - mechanical: $5.35/FT
    *   TCBP6 Place Buried - 37" through 48" cover - mechanical: $6.50/FT
    *   TCBP7 Place Buried - add'l depth in 6" increments mechanical: $1.50/FT

*   **Buried Service Wire (BSW)**:
    *   TCBSW10 Place BSW - each additional drop same trench: $0.35/FT
    *   TCBSW11 Place BSW - additional innerduct up to 2 inches: $1.30/FT
    *   TCBSW12 Place BSW - each additional drop in innerduct: $1.30/FT
    *   TCBSW13 Place BSW - road/driveway bore/pull (drop): $15.00/FT
    *   TCBSW14 Place BSW - bore - each additional innerduct: $1.45/FT
    *   TCBSW15 Place BSW - each buried drop facility in open path/trench: $0.55/FT
    *   TCBSW16 BSW - intercept existing duct: $50.00/EA
    *   TCBSW17 Trip charge - BSW - Single/Individual rate: $55.00/EA
    *   TCBSW18 Trip charge - BSW - Crew rate: $245.00/EA
    *   TCBSW3 Place BSW - buried service drop and duct-pull: $1.50/FT
    *   TCBSW4 Place BSW - buried service drop in duct-pull method: $0.85/FT
    *   TCBSW4B Place BSW - buried service drop in duct-blowing method: $1.20/FT
    *   TCBSW5 Place BSW - buried service drop or microduct: $1.30/FT
    *   TCBSW6 Place BSW - rod and place pull tape in innerduct for BSW: $1.50/FT
    *   TCBSW7 Place BSW - Rod and slug innerduct for BSW: $1.75/FT
    *   TCBSW8 Place BSW - Locate conduit end for BSW: $0.30/FT
    *   TCBSW9 Place BSW - handhole associated with One Fiber BSW: $135.00/EA

*   **Electronics**:
    *   TCE1 Electronics-Perform all steps of placing, testing and turnup of the OLT -Cabinet: $750.00/LOC
    *   TCE2 Electronics-Perform all steps of placing, testing and turnup of the OLT -Clam Shell: $620.00/LOC
    *   TCE3 Electronics-Perform all steps of placing, testing and turnup of the OLT -Strand: $390.00/LOC

*   **Maintenance & Misc Buried**:
    *   TCM10 Maintain Buried - dig and backfill splice pit over 60 cu. ft.: $10.00/CUFT
    *   TCM11 Maintain Buried - Pothole existing buried facilities: $120.00/EA
    *   TCM12 Maintain Buried - Replace flowerpot or handhole lid - all sizes: $40.00/EA
    *   TCM13 Move Charge - Buried: $230.00/EA
    *   TCM14 Place Buried - select backfill: $4.40/CU.FT.
    *   TCM7 Maintain Buried - straighten, raise, or lower handhole-all sizes: $185.00/EA
    *   TCM8 Maintain Buried - dig and backfill splice pit up to 30 cu. ft.: $290.00/EA
    *   TCM9 Maintain Buried - dig and backfill splice pit over 30 to 60 cu. ft.: $380.00/EA
    *   TCMB1 Place Buried - drop wire terminal: $50.00/EA
    *   TCMB10 Place Buried - ground wire: $2.00/FT
    *   TCMB11 Place Buried - Ground Rod - secondary function: $30.00/EA
    *   TCMB12 Relocate Buried - existing buried facilities: $4.50/FT
    *   TCMB13 Intercept Buried - encased conduit (concrete): $345.00/EA
    *   TCMB14 Intercept Buried - conduit: $3.00/FT
    *   TCMB15 Locate Buried - conduit end: $100.00/EA
    *   TCMB16 Place Buried - asphalt in 6" depth increments: $17.25/SQ.FT.
    *   TCMB17 Place Buried - concrete in 6" depth increments: $21.50/SQ.FT.
    *   TCMB19 Place Buried - Formed concrete: $30.00/CU.YD.
    *   TCMB2 Place Buried - flowerpot: $55.00/EA
    *   TCMB20 Place Buried - Unformed concrete: $30.00/CU.YD.
    *   TCMB21 Place Buried - dowel concrete: $36.00/EA
    *   TCMB22 Place Buried - core bore-manhole: $300.00/EA
    *   TCMB23 Place Buried - core bore-building entrance: $195.00/EA
    *   TCMB24 Place Buried - pull line-all types: $0.30/FT
    *   TCMB25 Place Buried - 6x6 post: $32.00/EA
    *   TCMB26 Place Buried – remote OLT Node in Optmius Pedestal: $150.00/EA
    *   TCMB27 Place Buried - power meter base: $124.00/EA
    *   TCMB28 Place Buried - alpha power cabinet: $324.00/EA
    *   TCMB29 Place Buried – OLT cabinet: $400.00/EA
    *   TCMB30 Place Buried - equipment and pad up to 10 sq. ft. (Per EA): $1,500.00/EA
    *   TCMB31 Place Buried - equipment and pad over 10 to 30 sq. ft. (Per EA): $1,800.00/EA
    *   TCMB32 Place Buried - equipment and pad over 30 to 50 sq. ft. (Per EA): $2,800.00/EA
    *   TCMB33 Place Buried - equipment and pad over 50 to 100 sq. ft. (Per EA): $3,500.00/EA
    *   TCMB34 Place Buried - concrete pad up to 10 sq. ft. (Per EA): $400.00/EA
    *   TCMB35 Place Buried - concrete pad over 10 to 30 sq. ft. (Per EA): $850.00
    *   TCMB36 Place Buried - concrete pad over 30 to 50 sq. ft. (Per EA): $1,500.00/EA
    *   TCMB37 Place Buried - concrete pad over 50 to 100 sq. ft. (Per EA): $2,000.00/EA
    *   TCMB3A Place Buried - handhole 13x24x18: $122.00/EA
    *   TCMB3B Place Buried - handhole 17x30x24: $243.00/EA
    *   TCMB3C Place Buried - handhole 24x36x24: $265.00/EA
    *   TCMB4 Place Buried - handhole 30x48x36: $440.00/EA
    *   TCMB5 Place Buried - locate wire - primary function: $1.00/FT
    *   TCMB6 Place Buried - locate wire in duct - primary function: $0.55/FT
    *   TCMB7 Place Buried - locate wire and/or locate wire in duct - secondary function: $0.35/FT
    *   TCMB8 Place Buried - ground rod - primary function: $50.00/EA
    *   TCMB9 Place Buried - ground rod system - primary function: $80.00/EA

*   **Trenching & Misc**:
    *   TCMT1 Micro Trenching 1”-9”: $12.25/FT
    *   TCMT2 Micro Trenching 9”-16”: $12.00/FT
    *   TCMT3 Micro Trenching 16”-26”: $12.75/FT
    *   TCMTT AERIAL – TREE TRIMMING: $1.25/FT

*   **Cabinets & Terminals**:
    *   TCMU1 Placement of Fiber Distribution Cabinet (FDH/OLT) - Vault Mounted: $375.00/EA
    *   TCMU2 Placement of Fiber Distribution Cabinet (FDH/OLT) - Pole Mounted: $450.00/EA
    *   TCMU3 Placement of Fiber Distribution Cabinet (FDH/OLT) - Wall / Rack Mounted: $450.00/EA
    *   TCMU4 Placement of Fiber Distribution Cabinet (FDH/OLT) - Vault / Sub surface Mounted: $415.00/EA
    *   TCMU4A TURNKEY PLACE / REPLACE FIBER DISTRIBUTION HUB CLOSURE/SWING ARM MOUNTED: $149.00/EA
    *   TCMU5 Placement of Fiber Distribution Terminal (FDT) - Vault Mounted-FlexNap: $65.00/EA
    *   TCMU6 Placement of Fiber Distribution Terminal (FDT) - Pole Mounted-FlexNap: $75.00/EA
    *   TCMU7 Placement of Fiber Distribution Terminal (FDT) - Wall / Rack Mounted-FlexNap: $65.00/EA
    *   TCMU8 Placement of Fiber Distribution Terminal (FDT) - Vault / Sub surface Mounted-FlexNap: $65.00/EA
    *   TCMU9 Placement of Fiber Distribution Terminal (FDT) – Building (SFU/MDU/MTU): $140.00/EA
    *   TCSP1 Placement of Bollard (Materials and Labor only): $200.00/EA
    *   TCSP2 Placement of Bollard (Materials, Labor, and Bollard): $375.00/EA

*   **Splicing**:
    *   TCSS1 Splicing - Cable Only-Splice-Fiber Optic loose tube Cable <=96 fibers: $29.80/EA
    *   TCSS11 Splicing - Prep, Splice and Place Terminal Closure... <= 12 Fibers: $194.00/EA
    *   TCSS2 Splicing - Cable Only-Splice-Splice Fiber Optic Ribbon Cable <=96 fibers: $12.75/EA
    *   TCSS3 Splicing - Cable Only-Splice-Splice Fiber Optic loose tube Cable >96 fibers: $25.00/EA
    *   TCSS4 Splicing - Cable Only-Splice Fiber Optic Ribbon Cable >96 fibers: $12.00/EA
    *   TCSS8 Splicing - Waste water removal: $75.00/EA
    *   TCSS9 Splicing - Prep, Splice and Place Terminal Closure (Primary and Secondary) Ribbon Cable <= 12 Fibers: $194.00/EA
    *   TCSSM Splicing - Splice Micro Duct at Lateral: $6.00/EA
    *   TCSSMD Splicing - Splice Micro Duct at Duct Access Point (DAP): $6.00/EA

*   **Underground**:
    *   TCU1 Place Underground - cable, wire, or pipe in open conduit-pull method: $1.50/FT
    *   TCU12 Remove Underground - cable, fiber, wire, or pipe: $0.45/FT
    *   TCU13 Remove Underground - Add ‘l facility removed simultaneously: $0.20/FT
    *   TCU1B Place Underground - conventional cable, wire, or pipe in open conduit-blowing method: $1.25/FT
    *   TCU3 Place Underground - Add ‘l cable, wire, or pipe simultaneously: $0.55/FT
    *   TCU4 Place Underground - pull tape/wire in conduit/innerduct: $0.75/FT
    *   TCU5 Place Underground - Add ‘l pull tape/wire in conduit/innerduct: $0.50/FT
    *   TCUB Place Underground - micro uni-tube fiber optic cable in open micro duct-blowing method: $0.45/FT
    *   TCUB1 HEXATRONIC STINGRAY DROP/CABLE (2 TO 24 FIBERS IN 7/3.5MM MICRODUCT) -BLOWING METHOD: $170.00/EA
    *   TMBT PLACE HEXATRONIC YARD CHAMBER/TOBY2 BOX: $40.00/EA

*   **Hourly / Restoration**:
    *   TCHR1 CDL Truck Driver - Differential Rate: $60.00/HR
    *   TCHR2 CDL Truck Driver - Normal Rate: $50.00/HR
    *   TCHR3 CDL Truck Driver - Over Time Rate: $75.00/HR
    *   TCHR4 CDL Truck Driver - Natural Disaster Rate Outside Market Radius: $90.00/HR
    *   TCHR5 CDL Truck Driver - Natural Disaster Rate Within Market Radius: $95.00/HR
    *   TCHR6 Electrician - Differential Rate: $120.00/HR
    *   TCHR7 Electrician - Normal Rate: $90.00/HR
    *   TCHR8 Electrician - Over Time Rate: $135.00/HR
    *   TCHR9 Electrician - Natural Disaster Rate Outside Market Radius: $175.00/HR
    *   TCHR10 Electrician - Natural Disaster Rate Within Market Radius: $155.00/HR
    *   TCHR11 Flagger - Differential Rate: $35.00/HR
    *   TCHR12 Flagger - Normal Rate: $40.00/HR
    *   TCHR13 Flagger - Over Time Rate: $60.00/HR
    *   TCHR14 Flagger - Natural Disaster Rate Outside Market Radius: $75.00/HR
    *   TCHR15 Flagger - Natural Disaster Rate Within Market Radius: $65.00/HR
    *   TCHR16 General Laborer - Differential Rate: $50.00/HR
    *   TCHR17 General Laborer - Normal Rate: $40.00/HR
    *   TCHR18 General Laborer - Over Time Rate: $55.00/HR
    *   TCHR19 General Laborer - Natural Disaster Rate Outside Market Radius: $75.00/HR
    *   TCHR20 General Laborer - Natural Disaster Rate Within Market Radius: $65.00/HR
    *   TCHR21 Journey Man - Differential Rate: $110.00/HR
    *   TCHR22 Journey Man - Normal Rate: $100.00/HR
    *   TCHR23 Journey Man - Over Time Rate: $150.00/HR
    *   TCHR24 Journey Man - Natural Disaster Rate Outside Market Radius: $190.00/HR
    *   TCHR25 Journey Man - Natural Disaster Rate Within Market Radius: $150.00/HR
    *   TCHR26 Lineman - Differential Rate: $75.00/HR
    *   TCHR27 Lineman - Normal Rate: $70.00/HR
    *   TCHR28 Lineman - Over Time Rate: $105.00/HR
    *   TCHR29 Lineman - Natural Disaster Rate Outside Market Radius: $165.00/HR
    *   TCHR30 Lineman - Natural Disaster Rate Within Market Radius: $115.00/HR
    *   TCHR31 Machine Operator - Differential Rate: $70.00/HR
    *   TCHR32 Machine Operator - Normal Rate: $60.00/HR
    *   TCHR33 Machine Operator - Over Time Rate: $85.00/HR
    *   TCHR34 - Natural Disaster Rate Outside Market Radius: $145.00/HR
    *   TCHR35 - Natural Disaster Rate Within Market Radius: $115.00/HR
    *   TCHR41 Skilled Laborer - Differential Rate: $68.00/HR
    *   TCHR42 Skilled Laborer - Normal Rate: $60.00/HR
    *   TCHR43 Skilled Laborer - Over Time Rate: $85.00/HR
    *   TCHR44 Skilled Laborer - Natural Disaster Rate Outside Market Radius: $115.00/HR
    *   TCHR45 Skilled Laborer - Natural Disaster Rate Within Market Radius: $90.00/HR
    *   TCHR46 Splicer - Differential Rate: $90.00/HR
    *   TCHR47 Splicer - Normal Rate: $80.00/HR
    *   TCHR48 Splicer - Over Time Rate: $115.50/HR
    *   TCHR49 Splicer - Natural Disaster Rate Outside Market Radius: $160.00/HR
    *   TCHR50 Splicer - Natural Disaster Rate Within Market Radius: $125.00/HR
    *   TCHR51 Supervisor - Differential Rate: $100.00/HR
    *   TCHR52 Supervisor - Normal Rate: $85.00/HR
    *   TCHR53 Supervisor - Over Time Rate: $120.00/HR
    *   TCHR54 Supervisor - Natural Disaster Rate Outside Market Radius: $145.00/HR
    *   TCHR55 Supervisor - Natural Disaster Rate Within Market Radius: $125.00/HR
    *   TCHR61 Per Diem Rate - Natural Disaster Outside Market Radius (Per DAY): $103.00
    *   TCHR62 Hourly Equipment Rate - traffic barrel - Normal Rate (Per HR): $3.50
    *   TCHR63 Daily Equipment Rate - traffic barrel - Normal Rate (Per DAY): $12.00
    *   TCHR64 Weekly Equipment Rate - traffic barrel - Normal Rate (Per WK): $57.00
    *   TCHR65 Hourly Equipment Rate - work zone sign - Normal Rate (Per HR): $3.50
    *   TCHR66 Daily Equipment Rate - work zone sign - Normal Rate (Per DAY): $16.50
    *   TCHR67 Weekly Equipment Rate - work zone sign - Normal Rate (Per WK): $57.00
    *   TCHR68 Hourly Equipment Rate - traffic cones - Normal Rate (Per HR): $1.80
    *   TCHR69 Hourly Equipment Rate - traffic cones - Over time Rate (Per HR): $3.00
    *   TCHR70 Daily Equipment Rate - traffic cones - Normal Rate (Per DAY): $12.00
    *   TCHR71 Daily Equipment Rate - traffic cones - Over time Rate (Per DAY): $12.00
    *   TCHR72 Weekly Equipment Rate - traffic cones - Normal Rate (Per WK): $60.00
    *   TCHR73 Daily Equipment Rate - steel plate - Normal Rate (Per DAY): $75.00
    *   TCHR74 Weekly Equipment Rate - steel plate - Normal Rate (Per WK): $72.00
    *   TCHR75 Monthly Equipment Rate - steel plate - Normal Rate (Per MO): $150.00
    *   TCHR76 Hourly Vehicle rate - large vehicle - Normal Rate (Per HR): $60.00
    *   TCHR77 Hourly Vehicle Rate - medium vehicle - Normal Rate (Per HR): $45.00
    *   TCHR78 Hourly Vehicle Rate - small vehicle - Normal Rate (Per HR): $24.00
    *   TCHR79 Hourly Equipment Rate - large equipment - Normal Rate (Per HR): $75.00
    *   TCHR80 Hourly Equipment Rate - medium equipment - Normal Rate (Per HR): $60.00
    *   TCHR81 Hourly Equipment Rate - Small Equipment (Other) - Normal Rate (Per HR): $57.00
    *   TCHR82 Hourly Equipment Rate - small mechanical equipment (hand-held) - Normal Rate (Per HR): $21.00
    *   TCHR83 Daily Equipment Rate - concrete barriers - Normal Rate (Per DAY): $45.00
    *   TCHR84 Weekly Equipment Rate - concrete barrier - Normal Rate (Per WK): $39.00
    *   TCHR85 Monthly Equipment Rate - concrete barrier - Normal Rate (Per MO): $162.00

*   **MDU / Specialized**:
    *   TEMDU-011 MDU MEETINGS (Per HR): $50.00
    *   TMBT PLACE HEXATRONIC YARD CHAMBER/TOBY2 BOX (Per EA): $24.00
    *   TMDU092-A FUSION SPLICE FIBER CABLE 1 to 15 Splices (Per EA): $24.00
    *   TMDU092-B FUSION SPLICE FIBER CABLE 16 to 30 Splices (Per EA): $23.00
    *   TMDU092-C FUSION SPLICE FIBER CABLE 31 to 50 Splices (Per EA): $20.00
    *   TMDU092-D FUSION SPLICE FIBER CABLE 51 to 99 Splices (Per EA): $19.00
    *   TMDU092-E FUSION SPLICE FIBER CABLE 100 & Above Splices (Per EA): $18.00
    *   TMDU094-A REMOVE MOLDING, 1 to 15 Units (Per LU): $15.50
    *   TMDU094-B REMOVE MOLDING, 16 to 30 Units (Per LU): $13.00
    *   TMDU094-C REMOVE MOLDING, 31 to 50 Units (Per LU): $11.50
    *   TMDU094-D REMOVE MOLDING, 51 to 99 Units (Per LU): $9.50
    *   TMDU094-E REMOVE MOLDING, 100 & Above Units (Per LU): $8.00
    *   TMDU096-A DRYWALL REPAIR 8"x8" to 12"x12" - 1 to 9 cut outs (Per EA): $43.00
    *   TMDU096-B DRYWALL REPAIR 8"x8" to 12"x12" - 10 or more cut outs (Per EA): $36.00
    *   TMDU096-C DRYWALL REPAIR 13"x13" to 18"x18" - 1 to 9 cut outs (Per EA): $47.00
    *   TMDU096-D DRYWALL REPAIR 13"x13" to 18"x18" 10 or more cut outs (Per EA): $39.00
    *   TMDU-013 CORE BORE -Greater than 2.5 to 4.0 Inch Diameter Hole up through 24 inches of material. 1 to 9 Hole(s). (Per EA): $90.00
    *   TMDU-013-A CORE BORE - below 2.5 Inch Diameter Hole through greater than 12 inches of material. 1 to 9Hole(s). (Per EA): $80.00
    *   TMDU-014 CORE BORE - Greater than 2.5 to 4.0 Inch Diameter Hole up through 24 inches of material. 10 or More Holes. (Per EA): $75.00
    *   TMDU-014-A CORE BORE - below 2.5 Inch Diameter Hole through greater than 12 inches of material. 10 orMore Hole(s). (Per EA): $65.00
    *   TMDU-015 CORE BORE - 4.1 to 5.0 Inch Diameter Hole up through 24 inches of material. 1 to 9 Hole(s). (Per EA): $99.00
    *   TMDU-016 CORE BORE - 4.1 to 5.0 Inch Diameter Hole up through 24 inches of material. 10 or More Holes. (Per EA): $89.00
    *   TMDU-021 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 1 to 9 Hole(s). (Per EA): $100.00
    *   TMDU-022 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 10 or MoreHoles. (Per EA): $90.00
    *   TMDU-023 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 1 to 9 Hole(s). (Per EA): $129.00
    *   TMDU-024 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 10 or MoreHoles. (Per EA): $119.00
    *   TMDU-029 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 36.1 inches and above of material. 1 to 9Hole(s). (Per EA): $134.00
    *   TMDU-030 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 36.1 inches and above of material. 10 or More Holes. (Per EA): $124.00
    *   TMDU-031 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 36.1 inches and above of material. 1 to 9Hole(s). (Per EA): $149.00
    *   TMDU-032 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 36.1 inches and above of material. 10 or More Holes. (Per EA): $139.00
    *   TMDU-047 PLACE TERMINAL BOX/EQUIPMENT/STORAGE BOX (Per EA): $20.00
    *   TMDU-050A PLACE ELECTRICAL CONDUIT EMT IN CONJUNCTION WITH TURNKEY CONSTRUCTION UNITS (Per FT): $4.00
    *   TMDU-050B PLACE ELECTRICAL CONDUIT EMT - NOT IN CONJUNCTION WITH TURNKEY CONSTRUCTIONUNITS (Per FT): $7.00
    *   TMDU-054 HAND RODDING / BLOWN IN OCCUPIED DUCT (Per FT): $0.30
    *   TMDU-055 HAND RODDING / BLOWN IN UN-OCCUPIED DUCT (Per FT): $0.00
    *   TMDU-066 PLACE ADDITIONAL WIRE/CABLE/FIBER/INNERDUCT (Per FT): $0.30
    *   TMDU-069 PLACE BACKBOARD & PROVIDE ENTRANCE HOLE (Per EA): $80.00
    *   TMDU-075 TRIP CHARGE CREW RATE - 2 MEN (Per EA): $90.00
    *   TMDU-076 INSTALL SMOOTH WALL INNERDUCT (Per FT): $2.00
    *   TMDU-091 GROUND PENATRATING RADAR SURVEY, 1 to 9 Scan(s) (Per SCAN): $190.00
    *   TMDU-092 GROUND PENATRATING RADAR SURVEY, 10 or more Scan(s) (Per SCAN): $160.00
    *   TMDU-095-A PLACE NEW MOLDING (Per FT): $2.00
    *   TMDU-095-B PLACE NEW MOLDING (Per FT): $1.00

*   **Turnkey Construction (Per Living Unit)**:
    *   TMDULU-001-A TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 1-15 UNITS (Per LU): $190.00
    *   TMDULU-001-B TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 16-30 UNITS (Per LU): $185.00
    *   TMDULU-001-C TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 31-50 UNITS (Per LU): $150.00
    *   TMDULU-001-D TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 51-99 UNITS (Per LU): $145.00
    *   TMDULU-001-E TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 100 AND GREATER UNITS (Per LU): $135.00
    *   TMDULU-002-A TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 1-15 UNITS (Per LU): $180.00
    *   TMDULU-002-B TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 16-30 UNITS (Per LU): $175.00
    *   TMDULU-002-C TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 31-50 UNITS (Per LU): $140.00
    *   TMDULU-002-D TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 51-99 UNITS (Per LU): $135.00
    *   TMDULU-002-E TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP (Entry to LU) MDU 100 AND GREATERUNITS (Per LU): $130.00
    *   TMDULU-003 MDU PREPARATION PER FLOOR (Per FL): $500.00
    *   TMDULU-004-A TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 1-15 UNITS (Per LU): $145.00
    *   TMDULU-004-B TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 16-30 UNITS (Per LU): $145.00
    *   TMDULU-004-C TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 31-50 UNITS (Per LU): $125.00
    *   TMDULU-004-D TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 51-99 UNITS (Per LU): $125.00
    *   TMDULU-004-E TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 100 AND GREATER UNITS (Per LU): $120.00
    *   TMDULU-005-A TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 1-15 UNITS (Per LU): $135.00
    *   TMDULU-005-B TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 16-30 UNITS (Per LU): $135.00
    *   TMDULU-005-C TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 31-50 UNITS (Per LU): $120.00
    *   TMDULU-005-D TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 51-99 UNITS (Per LU): $120.00
    *   TMDULU-005-E TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 100 AND GREATER UNITS (Per LU): $115.00
    *   TMDULU-006-A TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 1-15UNITS (Per LU): $95.00
    *   TMDULU-006-B TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 16-30 UNITS (Per LU): $90.00
    *   TMDULU-006-C TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 31-50UNITS (Per LU): $75.00
    *   TMDULU-006-D TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 51-99 UNITS (Per LU): $70.00
    *   TMDULU-006-E TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 100 AND GREATER UNITS (Per LU): $65.00
    *   TMDULU-007-A TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 1-15 UNITS (Per LU): $90.00
    *   TMDULU-007-B TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 16-30 UNITS (Per LU): $85.00
    *   TMDULU-007-C TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 31-50UNITS (Per LU): $70.00
    *   TMDULU-007-D TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 51-99 UNITS (Per LU): $65.00
    *   TMDULU-007-E TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 100 ANDGREATER UNITS (Per LU): $60.00
    *   TMDULU-008-A TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 1-15 UNITS (Per LU): $165.00
    *   TMDULU-008-B TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 16-30 UNITS (Per LU): $160.00
    *   TMDULU-008-C TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 31-50 UNITS (Per LU): $145.00
    *   TMDULU-008-D TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 51-99 UNITS (Per LU): $140.00
    *   TMDULU-008-E TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 100 AND GREATERUNITS (Per LU): $125.00
    *   TMDULU-009-A TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 1-15 UNITS (Per LU): $155.00
    *   TMDULU-009-B TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 16-30 UNITS (Per LU): $150.00
    *   TMDULU-009-C TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 31-50 UNITS (Per LU): $135.00
    *   TMDULU-009-D TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 51-99 UNITS (Per LU): $130.00
    *   TMDULU-009-E TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 100 AND GREATERUNITS (Per LU): $120.00
    *   TMDULU-022 SECURITY ADDER (Per LU): $90.00

## SECTION 6B: LIGHTSPEED SUBCONTRACTOR RATE CARD (Tillman Fiber 2024 - Revised 1/31/2025)
*   **Aerial**:
    *   TCA1 Place Aerial - Strand 6M to 6.6M (Per FT): $0.55
    *   TCA1A Place Aerial-Anchor and Rod-Mechanical (Per EA): $30.00
    *   TCA1B Place Aerial-Anchor and Rod-Hand-Dig (Per EA): $30.00
    *   TCA2 Place Aerial - Stand 10M to 25M (Per FT): $0.70
    *   TCA3 Place Aerial - Self-support fiber (Per FT): $0.80
    *   TCA4 Place Aerial - Self-support flexible duct (Per FT): $0.90
    *   TCA5 Place Aerial - Total Bundle for route < 2500' (Per FT): $0.70
    *   TCA6 Place Aerial - Total Bundle for route >5000' (Per FT): $0.65
    *   TCA7 Place Aerial - Total Bundle for route < 5000' (Per FT): $0.60

*   **Buried - Directional Bore**:
    *   TCBDB2 Place Buried - directional bore - standard - up to 4.0" outside diameter bundle (Per FT): $7.00
    *   TCBDB4 Place Buried - directional bore - standard - over 4.0" to 7.0" outside diameter bundle (Per FT): $9.00
    *   TCBDB8 Place Buried - directional bore - rock - up to 4.0" outside diameter bundle (Per FT): $15.00
    *   TCBDB9 Place Buried - directional bore - rock - over 4.0" to 7.0" outside diameter bundle (Per FT): $17.00

*   **Buried - Hand Dig**:
    *   TCBHD1 Place Buried - 6" cover - hand dig (Per FT): $2.70
    *   TCBHD2 Place Buried - 7" through 12" cover - hand dig (Per FT): $3.30
    *   TCBHD3 Place Buried - 12" through 18" cover - hand dig (Per FT): $3.90
    *   TCBHD4 Place Buried - 19" through 24" cover - hand dig (Per FT): $4.00
    *   TCBHD5 Place Buried - 25" through 36" cover - hand dig (Per FT): $4.25
    *   TCBHD6 Place Buried - 37" through 48" cover - hand dig (Per FT): $4.50
    *   TCBHD7 Place Buried - add'l depth in 6" increments - hand dig (Per FT): $0.50

*   **Buried - Missile Bore**:
    *   TCBMB1 Place Buried - missile bore - up to 4.0" outside diameter bundle (Per FT): $5.50
    *   TCBMB2 Place Buried - missile bore - over 4.0" to 7.0" outside diameter bundle (Per FT): $7.50

*   **Buried - Mechanical**:
    *   TCBP1 Place Buried - 6" cover - mechanical (Per FT): $1.50
    *   TCBP2 Place Buried - 7" through 12" cover - mechanical (Per FT): $1.65
    *   TCBP3 Place Buried - 12" through 18" cover - mechanical (Per FT): $1.75
    *   TCBP4 Place Buried - 19" through 24" cover - mechanical (Per FT): $1.85
    *   TCBP5 Place Buried - 25" through 36" cover - mechanical (Per FT): $1.95
    *   TCBP6 Place Buried - 37" through 48" cover - mechanical (Per FT): $2.50
    *   TCBP7 Place Buried - add'l depth in 6" increments mechanical (Per FT): $0.50

*   **Buried Service Wire (BSW)**:
    *   TCBSW3 Place BSW - buried service drop and duct-pull (Per FT): $0.80
    *   TCBSW4 Place BSW - buried service drop in duct-pull method (Per FT): $0.50
    *   TCBSW4B Place BSW - buried service drop in duct-blowing method (Per FT): $0.70
    *   TCBSW5 Place BSW - buried service drop or microduct (Per FT): $0.75
    *   TCBSW6 Place BSW - rod and place pull tape in innerduct for BSW (Per FT): $0.50
    *   TCBSW7 Place BSW - Rod and slug innerduct for BSW (Per FT): $0.75
    *   TCBSW8 Place BSW - Locate conduit end for BSW (Per FT): $0.18
    *   TCBSW9 Place BSW - handhole associated with One Fiber BSW (Per EA): $75.00
    *   TCBSW10 Place BSW - each additional drop same trench (Per FT): $0.20
    *   TCBSW11 Place BSW - additional innerduct up to 2 inches (Per FT): $0.75
    *   TCBSW12 Place BSW - each additional drop in innerduct (Per FT): $0.75
    *   TCBSW13 Place BSW - road/driveway bore/pull (drop) (Per FT): $8.00
    *   TCBSW14 Place BSW - bore - each additional innerduct (Per FT): $0.75
    *   TCBSW15 Place BSW - each buried drop facility in open path/trench (Per FT): $0.30
    *   TCBSW16 BSW - intercept existing duct (Per EA): $30.00
    *   TCBSW17 Trip charge - BSW - Single/Individual rate (Per EA): $33.00
    *   TCBSW18 Trip charge - BSW - Crew rate (Per EA): $147.00

*   **Electronics**:
    *   TCE1 Electronics-Perform all steps of placing, testing and turnup of the OLT -Cabinet. (Per LOC): $450.00
    *   TCE2 Electronics-Perform all steps of placing, testing and turnup of the OLT -Clam Shell. (Per LOC): $372.00
    *   TCE3 Electronics-Perform all steps of placing, testing and turnup of the OLT -Strand. (Per LOC): $234.00

*   **Hourly / Restoration**:
    *   TCHR1 CDL Truck Driver - Differential Rate (Per HR): $36.00
    *   TCHR2 CDL Truck Driver - Normal Rate (Per HR): $30.00
    *   TCHR3 CDL Truck Driver - Over Time Rate (Per HR): $45.00
    *   TCHR4 CDL Truck Driver - Natural Disaster Rate Outside Market Radius (Per HR): $54.00
    *   TCHR5 CDL Truck Driver - Natural Disaster Rate Within Market Radius (Per HR): $57.00
    *   TCHR6 Electrician - Differential Rate (Per HR): $72.00
    *   TCHR7 Electrician - Normal Rate (Per HR): $54.00
    *   TCHR8 Electrician - Over Time Rate (Per HR): $81.00
    *   TCHR9 Electrician - Natural Disaster Rate Outside Market Radius (Per HR): $105.00
    *   TCHR10 Electrician - Natural Disaster Rate Within Market Radius (Per HR): $93.00
    *   TCHR11 Flagger - Differential Rate (Per HR): $21.00
    *   TCHR12 Flagger - Normal Rate (Per HR): $24.00
    *   TCHR13 Flagger - Over Time Rate (Per HR): $36.00
    *   TCHR14 Flagger - Natural Disaster Rate Outside Market Radius (Per HR): $45.00
    *   TCHR15 Flagger - Natural Disaster Rate Within Market Radius (Per HR): $39.00
    *   TCHR16 General Laborer - Differential Rate (Per HR): $30.00
    *   TCHR17 General Laborer - Normal Rate (Per HR): $24.00
    *   TCHR18 General Laborer - Over Time Rate (Per HR): $33.00
    *   TCHR19 General Laborer - Natural Disaster Rate Outside Market Radius (Per HR): $45.00
    *   TCHR20 General Laborer - Natural Disaster Rate Within Market Radius (Per HR): $39.00
    *   TCHR21 Journey Man - Differential Rate (Per HR): $66.00
    *   TCHR22 Journey Man - Normal Rate (Per HR): $60.00
    *   TCHR23 Journey Man - Over Time Rate (Per HR): $90.00
    *   TCHR24 Journey Man - Natural Disaster Rate Outside Market Radius (Per HR): $114.00
    *   TCHR25 Journey Man - Natural Disaster Rate Within Market Radius (Per HR): $90.00
    *   TCHR26 Lineman - Differential Rate (Per HR): $45.00
    *   TCHR27 Lineman - Normal Rate (Per HR): $42.00
    *   TCHR28 Lineman - Over Time Rate (Per HR): $63.00
    *   TCHR29 Lineman - Natural Disaster Rate Outside Market Radius (Per HR): $99.00
    *   TCHR30 Lineman - Natural Disaster Rate Within Market Radius (Per HR): $69.00
    *   TCHR31 Machine Operator - Differential Rate (Per HR): $42.00
    *   TCHR32 Machine Operator - Normal Rate (Per HR): $36.00
    *   TCHR33 Machine Operator - Over Time Rate (Per HR): $51.00
    *   TCHR34 - Natural Disaster Rate Outside Market Radius (Per HR): $87.00
    *   TCHR35 - Natural Disaster Rate Within Market Radius (Per HR): $69.00
    *   TCHR41 Skilled Laborer - Differential Rate (Per HR): $40.80
    *   TCHR42 Skilled Laborer - Normal Rate (Per HR): $36.00
    *   TCHR43 Skilled Laborer - Over Time Rate (Per HR): $51.00
    *   TCHR44 Skilled Laborer - Natural Disaster Rate Outside Market Radius (Per HR): $69.00
    *   TCHR45 Skilled Laborer - Natural Disaster Rate Within Market Radius (Per HR): $54.00
    *   TCHR46 Splicer - Differential Rate (Per HR): $54.00
    *   TCHR47 Splicer - Normal Rate (Per HR): $48.00
    *   TCHR48 Splicer - Over Time Rate (Per HR): $69.30
    *   TCHR49 Splicer - Natural Disaster Rate Outside Market Radius (Per HR): $96.00
    *   TCHR50 Splicer - Natural Disaster Rate Within Market Radius (Per HR): $75.00
    *   TCHR51 Supervisor - Differential Rate (Per HR): $60.00
    *   TCHR52 Supervisor - Normal Rate (Per HR): $51.00
    *   TCHR53 Supervisor - Over Time Rate (Per HR): $72.00
    *   TCHR54 Supervisor - Natural Disaster Rate Outside Market Radius (Per HR): $87.00
    *   TCHR55 Supervisor - Natural Disaster Rate Within Market Radius (Per HR): $75.00
    *   TCHR61 Per Diem Rate - Natural Disaster Outside Market Radius (Per DAY): $103.00
    *   TCHR62 Hourly Equipment Rate - traffic barrel - Normal Rate (Per HR): $3.50
    *   TCHR63 Daily Equipment Rate - traffic barrel - Normal Rate (Per DAY): $12.00
    *   TCHR64 Weekly Equipment Rate - traffic barrel - Normal Rate (Per WK): $57.00
    *   TCHR65 Hourly Equipment Rate - work zone sign - Normal Rate (Per HR): $3.50
    *   TCHR66 Daily Equipment Rate - work zone sign - Normal Rate (Per DAY): $16.50
    *   TCHR67 Weekly Equipment Rate - work zone sign - Normal Rate (Per WK): $57.00
    *   TCHR68 Hourly Equipment Rate - traffic cones - Normal Rate (Per HR): $1.80
    *   TCHR69 Hourly Equipment Rate - traffic cones - Over time Rate (Per HR): $3.00
    *   TCHR70 Daily Equipment Rate - traffic cones - Normal Rate (Per DAY): $12.00
    *   TCHR71 Daily Equipment Rate - traffic cones - Over time Rate (Per DAY): $12.00
    *   TCHR72 Weekly Equipment Rate - traffic cones - Normal Rate (Per WK): $60.00
    *   TCHR73 Daily Equipment Rate - steel plate - Normal Rate (Per DAY): $75.00
    *   TCHR74 Weekly Equipment Rate - steel plate - Normal Rate (Per WK): $72.00
    *   TCHR75 Monthly Equipment Rate - steel plate - Normal Rate (Per MO): $150.00
    *   TCHR76 Hourly Vehicle rate - large vehicle - Normal Rate (Per HR): $60.00
    *   TCHR77 Hourly Vehicle Rate - medium vehicle - Normal Rate (Per HR): $45.00
    *   TCHR78 Hourly Vehicle Rate - small vehicle - Normal Rate (Per HR): $24.00
    *   TCHR79 Hourly Equipment Rate - large equipment - Normal Rate (Per HR): $75.00
    *   TCHR80 Hourly Equipment Rate - medium equipment - Normal Rate (Per HR): $60.00
    *   TCHR81 Hourly Equipment Rate - Small Equipment (Other) - Normal Rate (Per HR): $57.00
    *   TCHR82 Hourly Equipment Rate - small mechanical equipment (hand-held) - Normal Rate (Per HR): $21.00
    *   TCHR83 Daily Equipment Rate - concrete barriers - Normal Rate (Per DAY): $45.00
    *   TCHR84 Weekly Equipment Rate - concrete barrier - Normal Rate (Per WK): $39.00
    *   TCHR85 Monthly Equipment Rate - concrete barrier - Normal Rate (Per MO): $162.00

*   **Maintenance**:
    *   TCM7 Maintain Buried - straighten, raise, or lower handhole-all sizes (Per EA): $100.00
    *   TCM8 Maintain Buried - dig and backfill splice pit up to 30 cu. ft. (Per EA): $170.00
    *   TCM9 Maintain Buried - dig and backfill splice pit over 30 to 60 cu. ft. (Per EA): $225.00
    *   TCM10 Maintain Buried - dig and backfill splice pit over 60 cu. ft. (Per CUFT): $5.00
    *   TCM11 Maintain Buried - Pothole existing buried facilities (Per EA): $50.00
    *   TCM12 Maintain Buried - Replace flowerpot or handhole lid - all sizes (Per EA): $24.00
    *   TCM13 Move Charge - Buried (Per EA): $125.00
    *   TCM14 Place Buried - select backfill (Per CU.FT.): $2.50

*   **Buried Misc**:
    *   TCMB1 Place Buried - drop wire terminal (Per EA): $28.00
    *   TCMB2 Place Buried - flowerpot (Per EA): $30.00
    *   TCMB3A Place Buried - handhole 13x24x18 (Per EA): $70.00
    *   TCMB3B Place Buried - handhole 17x30x24 (Per EA): $140.00
    *   TCMB3C Place Buried - handhole 24x36x24 (Per EA): $155.00
    *   TCMB4 Place Buried - handhole 30x48x36 (Per EA): $250.00
    *   TCMB5 Place Buried - locate wire - primary function (Per FT): $0.55
    *   TCMB6 Place Buried - locate wire in duct - primary function (Per FT): $0.30
    *   TCMB7 Place Buried - locate wire and/or locate wire in duct - secondary function (Per FT): $0.20
    *   TCMB8 Place Buried - ground rod - primary function (Per EA): $25.00
    *   TCMB9 Place Buried - ground rod system - primary function (Per EA): $48.00
    *   TCMB10 Place Buried - ground wire (Per FT): $1.00
    *   TCMB11 Place Buried - Ground Rod - secondary function (Per EA): $18.00
    *   TCMB12 Relocate Buried - existing buried facilities (Per FT): $2.50
    *   TCMB13 Intercept Buried - encased conduit (concrete) (Per EA): $200.00
    *   TCMB14 Intercept Buried - conduit (Per FT): $1.75
    *   TCMB15 Locate Buried - conduit end (Per EA): $55.00
    *   TCMB16 Place Buried - asphalt in 6" depth increments (Per SQ.FT.): $10.00
    *   TCMB17 Place Buried - concrete in 6" depth increments (Per SQ.FT.): $12.50
    *   TCMB19 Place Buried - Formed concrete (Per CU.YD.): $17.00
    *   TCMB20 Place Buried - Unformed concrete (Per CU.YD.): $18.00
    *   TCMB21 Place Buried - dowel concrete (Per EA): $20.00
    *   TCMB22 Place Buried - core bore-manhole (Per EA): $180.00
    *   TCMB23 Place Buried - core bore-building entrance (Per EA): $115.00
    *   TCMB24 Place Buried - pull line-all types (Per FT): $0.18
    *   TCMB25 Place Buried - 6x6 post (Per EA): $19.00
    *   TCMB26 Place Buried - remote OLT Node in Optmius Pedestal (Per EA): $85.00
    *   TCMB27 Place Buried - power meter base (Per EA): $70.00
    *   TCMB28 Place Buried - alpha power cabinet (Per EA): $180.00
    *   TCMB29 Place Buried - OLT cabinet (Per EA): $230.00
    *   TCMB30 Place Buried - equipment and pad up to 10 sq. ft. (Per EA): $850.00
    *   TCMB31 Place Buried - equipment and pad over 10 to 30 sq. ft. (Per EA): $1,000.00
    *   TCMB32 Place Buried - equipment and pad over 30 to 50 sq. ft. (Per EA): $1,600.00
    *   TCMB33 Place Buried - equipment and pad over 50 to 100 sq. ft. (Per EA): $2,000.00
    *   TCMB34 Place Buried - concrete pad up to 10 sq. ft. (Per EA): $240.00
    *   TCMB35 Place Buried - concrete pad over 10 to 30 sq. ft. (Per EA): $500.00
    *   TCMB36 Place Buried - concrete pad over 30 to 50 sq. ft. (Per EA): $850.00
    *   TCMB37 Place Buried - concrete pad over 50 to 100 sq. ft. (Per EA): $1,150.00

*   **Trenching & Misc**:
    *   TCMT1 Micro Trenching 1"-9" (Per FT): $7.25
    *   TCMT2 Micro Trenching 9"-16" (Per FT): $7.15
    *   TCMT3 Micro Trenching 16"-26" (Per FT): $7.60
    *   TCMTT AERIAL - TREE TRIMMING (Per FT): $0.65
    *   TCMU Material Mark-up (Cost + 5%): $0.00

*   **Cabinets & Terminals**:
    *   TCMU1 Placement of Fiber Distribution Cabinet (FDH/OLT) - Vault Mounted (Per EA): $215.00
    *   TCMU2 Placement of Fiber Distribution Cabinet (FDH/OLT) - Pole Mounted (Per EA): $250.00
    *   TCMU3 Placement of Fiber Distribution Cabinet (FDH/OLT) - Wall / Rack Mounted (Per EA): $250.00
    *   TCMU4 Placement of Fiber Distribution Cabinet (FDH/OLT) - Vault / Sub surface Mounted (Per EA): $249.00
    *   TCMU4A TURNKEY PLACE / REPLACE FIBER DISTRIBUTION HUB CLOSURE/SWING ARM MOUNTED (Per EA): $85.00
    *   TCMU5 Placement of Fiber Distribution Terminal (FDT) - Vault Mounted-FlexNap (Per EA): $38.00
    *   TCMU6 Placement of Fiber Distribution Terminal (FDT) - Pole Mounted-FlexNap (Per EA): $43.00
    *   TCMU7 Placement of Fiber Distribution Terminal (FDT) - Wall / Rack Mounted-FlexNap (Per EA): $38.00
    *   TCMU8 Placement of Fiber Distribution Terminal (FDT) - Vault / Sub surface Mounted-FlexNap (Per EA): $38.00
    *   TCMU9 Placement of Fiber Distribution Terminal (FDT) - Building (SFU/MDU/MTU) (Per EA): $82.00
    *   TCSP1 Placement of Bollard (Materials and Labor only) (Per EA): $120.00
    *   TCSP2 Placement of Bollard (Materials, Labor, and Bollard) (Per EA): $225.00

*   **Splicing**:
    *   TCSS1 Splicing - Cable Only-Splice-Fiber Optic loose tube Cable <=96 fibers (Per EA): $17.00
    *   TCSS2 Splicing - Cable Only-Splice-Splice Fiber Optic Ribbon Cable <=96 fibers (Per EA): $6.50
    *   TCSS3 Splicing - Cable Only-Splice-Splice Fiber Optic loose tube Cable >96 fibers (Per EA): $15.00
    *   TCSS4 Splicing - Cable Only-Splice Fiber Optic Ribbon Cable >96 fibers (Per EA): $6.00
    *   TCSS8 Splicing - Waste water removal (Per EA): $45.00
    *   TCSS9 Splicing - Prep, Splice and Place Terminal Closure (Primary and Secondary) Ribbon Cable <= 12 Fibers (Per EA): $115.00
    *   TCSS11 Splicing - Prep, Splice and Place Terminal Closure (Primary and Secondary) loose tube Cable <=12 Fibers (Per EA): $115.00
    *   TCSSM Splicing - Splice Micro Duct at Lateral (Per EA): $3.60
    *   TCSSMD Splicing - Splice Micro Duct at Duct Access Point (DAP) (Per EA): $3.60

*   **Underground**:
    *   TCU1 Place Underground - cable, wire, or pipe in open conduit-pull method (Per FT): $0.75
    *   TCU1B Place Underground - conventional cable, wire, or pipe in open conduit-blowing method (Per FT): $0.70
    *   TCU3 Place Underground - Add ‘l cable, wire, or pipe simultaneously (Per FT): $0.30
    *   TCU4 Place Underground - pull tape/wire in conduit/innerduct (Per FT): $0.45
    *   TCU5 Place Underground - Add ‘l pull tape/wire in conduit/innerduct (Per FT): $0.25
    *   TCU12 Remove Underground - cable, fiber, wire, or pipe (Per FT): $0.27
    *   TCU13 Remove Underground - Add ‘l facility removed simultaneously (Per FT): $0.12
    *   TCUB Place Underground - micro uni-tube fiber optic cable in open micro duct-blowing method (Per FT): $0.25
    *   TCUB1 HEXATRONIC STINGRAY DROP/CABLE (2 TO 24 FIBERS IN 7/3.5MM MICRODUCT) -BLOWING METHOD (Per EA): $100.00

*   **MDU / Specialized**:
    *   TEMDU-011 MDU MEETINGS (Per HR): $50.00
    *   TMBT PLACE HEXATRONIC YARD CHAMBER/TOBY2 BOX (Per EA): $24.00
    *   TMDU092-A FUSION SPLICE FIBER CABLE 1 to 15 Splices (Per EA): $24.00
    *   TMDU092-B FUSION SPLICE FIBER CABLE 16 to 30 Splices (Per EA): $23.00
    *   TMDU092-C FUSION SPLICE FIBER CABLE 31 to 50 Splices (Per EA): $20.00
    *   TMDU092-D FUSION SPLICE FIBER CABLE 51 to 99 Splices (Per EA): $19.00
    *   TMDU092-E FUSION SPLICE FIBER CABLE 100 & Above Splices (Per EA): $18.00
    *   TMDU094-A REMOVE MOLDING, 1 to 15 Units (Per LU): $15.50
    *   TMDU094-B REMOVE MOLDING, 16 to 30 Units (Per LU): $13.00
    *   TMDU094-C REMOVE MOLDING, 31 to 50 Units (Per LU): $11.50
    *   TMDU094-D REMOVE MOLDING, 51 to 99 Units (Per LU): $9.50
    *   TMDU094-E REMOVE MOLDING, 100 & Above Units (Per LU): $8.00
    *   TMDU096-A DRYWALL REPAIR 8"x8" to 12"x12" - 1 to 9 cut outs (Per EA): $43.00
    *   TMDU096-B DRYWALL REPAIR 8"x8" to 12"x12" - 10 or more cut outs (Per EA): $36.00
    *   TMDU096-C DRYWALL REPAIR 13"x13" to 18"x18" - 1 to 9 cut outs (Per EA): $47.00
    *   TMDU096-D DRYWALL REPAIR 13"x13" to 18"x18" 10 or more cut outs (Per EA): $39.00
    *   TMDU-013 CORE BORE -Greater than 2.5 to 4.0 Inch Diameter Hole up through 24 inches of material. 1 to 9 Hole(s). (Per EA): $90.00
    *   TMDU-013-A CORE BORE - below 2.5 Inch Diameter Hole through greater than 12 inches of material. 1 to 9Hole(s). (Per EA): $80.00
    *   TMDU-014 CORE BORE - Greater than 2.5 to 4.0 Inch Diameter Hole up through 24 inches of material. 10 or More Holes. (Per EA): $75.00
    *   TMDU-014-A CORE BORE - below 2.5 Inch Diameter Hole through greater than 12 inches of material. 10 orMore Hole(s). (Per EA): $65.00
    *   TMDU-015 CORE BORE - 4.1 to 5.0 Inch Diameter Hole up through 24 inches of material. 1 to 9 Hole(s). (Per EA): $99.00
    *   TMDU-016 CORE BORE - 4.1 to 5.0 Inch Diameter Hole up through 24 inches of material. 10 or More Holes. (Per EA): $89.00
    *   TMDU-021 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 1 to 9 Hole(s). (Per EA): $100.00
    *   TMDU-022 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 10 or MoreHoles. (Per EA): $90.00
    *   TMDU-023 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 1 to 9 Hole(s). (Per EA): $129.00
    *   TMDU-024 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 24.1 to 36.0 inches of material. 10 or MoreHoles. (Per EA): $119.00
    *   TMDU-029 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 36.1 inches and above of material. 1 to 9Hole(s). (Per EA): $134.00
    *   TMDU-030 CORE BORE- 2.5 to 4.0 Inch Diameter Hole through 36.1 inches and above of material. 10 or More Holes. (Per EA): $124.00
    *   TMDU-031 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 36.1 inches and above of material. 1 to 9Hole(s). (Per EA): $149.00
    *   TMDU-032 CORE BORE - 4.1 to 5.0 Inch Diameter Hole through 36.1 inches and above of material. 10 or More Holes. (Per EA): $139.00
    *   TMDU-047 PLACE TERMINAL BOX/EQUIPMENT/STORAGE BOX (Per EA): $20.00
    *   TMDU-050A PLACE ELECTRICAL CONDUIT EMT IN CONJUNCTION WITH TURNKEY CONSTRUCTION UNITS (Per FT): $4.00
    *   TMDU-050B PLACE ELECTRICAL CONDUIT EMT - NOT IN CONJUNCTION WITH TURNKEY CONSTRUCTIONUNITS (Per FT): $7.00
    *   TMDU-054 HAND RODDING / BLOWN IN OCCUPIED DUCT (Per FT): $0.30
    *   TMDU-055 HAND RODDING / BLOWN IN UN-OCCUPIED DUCT (Per FT): $0.00
    *   TMDU-066 PLACE ADDITIONAL WIRE/CABLE/FIBER/INNERDUCT (Per FT): $0.30
    *   TMDU-069 PLACE BACKBOARD & PROVIDE ENTRANCE HOLE (Per EA): $80.00
    *   TMDU-075 TRIP CHARGE CREW RATE - 2 MEN (Per EA): $90.00
    *   TMDU-076 INSTALL SMOOTH WALL INNERDUCT (Per FT): $2.00
    *   TMDU-091 GROUND PENATRATING RADAR SURVEY, 1 to 9 Scan(s) (Per SCAN): $190.00
    *   TMDU-092 GROUND PENATRATING RADAR SURVEY, 10 or more Scan(s) (Per SCAN): $160.00
    *   TMDU-095-A PLACE NEW MOLDING (Per FT): $2.00
    *   TMDU-095-B PLACE NEW MOLDING (Per FT): $1.00

*   **Turnkey Construction (Per Living Unit)**:
    *   TMDULU-001-A TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 1-15 UNITS (Per LU): $190.00
    *   TMDULU-001-B TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 16-30 UNITS (Per LU): $185.00
    *   TMDULU-001-C TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 31-50 UNITS (Per LU): $150.00
    *   TMDULU-001-D TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 51-99 UNITS (Per LU): $145.00
    *   TMDULU-001-E TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (Entry to LU) MDU 100 AND GREATER UNITS (Per LU): $135.00
    *   TMDULU-002-A TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 1-15 UNITS (Per LU): $180.00
    *   TMDULU-002-B TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 16-30 UNITS (Per LU): $175.00
    *   TMDULU-002-C TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 31-50 UNITS (Per LU): $140.00
    *   TMDULU-002-D TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (Entry to LU) MDU 51-99 UNITS (Per LU): $135.00
    *   TMDULU-002-E TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP (Entry to LU) MDU 100 AND GREATERUNITS (Per LU): $130.00
    *   TMDULU-003 MDU PREPARATION PER FLOOR (Per FL): $500.00
    *   TMDULU-004-A TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 1-15 UNITS (Per LU): $145.00
    *   TMDULU-004-B TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 16-30 UNITS (Per LU): $145.00
    *   TMDULU-004-C TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 31-50 UNITS (Per LU): $125.00
    *   TMDULU-004-D TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 51-99 UNITS (Per LU): $125.00
    *   TMDULU-004-E TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (No Entry to LU) MDU 100 AND GREATER UNITS (Per LU): $120.00
    *   TMDULU-005-A TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 1-15 UNITS (Per LU): $135.00
    *   TMDULU-005-B TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 16-30 UNITS (Per LU): $135.00
    *   TMDULU-005-C TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 31-50 UNITS (Per LU): $120.00
    *   TMDULU-005-D TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 51-99 UNITS (Per LU): $120.00
    *   TMDULU-005-E TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (No Entry to LU) MDU 100 AND GREATER UNITS (Per LU): $115.00
    *   TMDULU-006-A TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 1-15UNITS (Per LU): $95.00
    *   TMDULU-006-B TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 16-30 UNITS (Per LU): $90.00
    *   TMDULU-006-C TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 31-50UNITS (Per LU): $75.00
    *   TMDULU-006-D TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 51-99 UNITS (Per LU): $70.00
    *   TMDULU-006-E TURNKEY CONSTRUCTION (TWO STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 100 AND GREATER UNITS (Per LU): $65.00
    *   TMDULU-007-A TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 1-15 UNITS (Per LU): $90.00
    *   TMDULU-007-B TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 16-30 UNITS (Per LU): $85.00
    *   TMDULU-007-C TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 31-50UNITS (Per LU): $70.00
    *   TMDULU-007-D TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 51-99 UNITS (Per LU): $65.00
    *   TMDULU-007-E TURNKEY CONSTRUCTION (ONE STEP) PER LIVING UNIT, (Half Fee Incomplete) MDU 100 ANDGREATER UNITS (Per LU): $60.00
    *   TMDULU-008-A TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 1-15 UNITS (Per LU): $165.00
    *   TMDULU-008-B TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 16-30 UNITS (Per LU): $160.00
    *   TMDULU-008-C TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 31-50 UNITS (Per LU): $145.00
    *   TMDULU-008-D TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 51-99 UNITS (Per LU): $140.00
    *   TMDULU-008-E TURNKEY CONSTRUCTION PER LIVING UNIT-TWO STEP, (GREENFIELD) MDU 100 AND GREATERUNITS (Per LU): $125.00
    *   TMDULU-009-A TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 1-15 UNITS (Per LU): $155.00
    *   TMDULU-009-B TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 16-30 UNITS (Per LU): $150.00
    *   TMDULU-009-C TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 31-50 UNITS (Per LU): $135.00
    *   TMDULU-009-D TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 51-99 UNITS (Per LU): $130.00
    *   TMDULU-009-E TURNKEY CONSTRUCTION PER LIVING UNIT-ONE STEP, (GREENFIELD) MDU 100 AND GREATERUNITS (Per LU): $120.00
    *   TMDULU-022 SECURITY ADDER (Per LU): $90.00

## SECTION 6C: TILLMAN FIBER EMPLOYEE RATE CARD
*   ** AERIAL PLACEMENT **

    * TCA1: Place Aerial - Strand 6M to 6.6M: $0.20/FT
    * TCA1A: Place Aerial - Anchor and Rod (Mechanical): $15.00/EA
    * TCA1B: Place Aerial - Anchor and Rod (Hand-Dig): $15.00/EA
    * TCA2: Place Aerial - Stand 10M to 25M: $0.30/FT
    * TCA3: Place Aerial - Self-support Fiber: $0.35/FT
    * TCA4: Place Aerial - Self-support Flexible Duct: $0.35/FT
    * TCA5: Place Aerial - Total Bundle (Route <2500'): $0.40/FT
    * TCA6: Place Aerial - Total Bundle (Route >5000'): $0.38/FT
    * TCA7: Place Aerial - Total Bundle (Route <5000'): $0.36/FT
    * TCMTT: Aerial - Tree Trimming: $0.25/FT

*   ** BURIED PLACEMENT - DIRECTIONAL BORE **

    * TCBDB2: Directional Bore - Standard (≤4.0" OD Bundle): $2.00/FT
    * TCBDB4: Directional Bore - Standard (>4.0" to 7.0" OD Bundle): $3.00/FT
    * TCBDB8: Directional Bore - Rock (≤4.0" OD Bundle): $5.00/FT
    * TCBDB9: Directional Bore - Rock (>4.0" to 7.0" OD Bundle): $6.00/FT

*   ** BURIED PLACEMENT - HAND DIG **

    * TCBHD1: Hand Dig - 6" Cover: $1.00/FT
    * TCBHD2: Hand Dig - 7" through 12" Cover: $1.25/FT
    * TCBHD3: Hand Dig - 12" through 18" Cover: $1.50/FT
    * TCBHD4: Hand Dig - 19" through 24" Cover: $1.75/FT
    * TCBHD5: Hand Dig - 25" through 36" Cover: $2.00/FT
    * TCBHD6: Hand Dig - 37" through 48" Cover: $2.25/FT
    * TCBHD7: Hand Dig - Additional Depth in 6" Increments: $0.25/FT

*   ** BURIED PLACEMENT - MECHANICAL **

    * TCBP1: Mechanical - 6" Cover: $1.00/FT
    * TCBP2: Mechanical - 7" through 12" Cover: $1.00/FT
    * TCBP3: Mechanical - 12" through 18" Cover: $1.00/FT
    * TCBP4: Mechanical - 19" through 24" Cover: $1.00/FT
    * TCBP5: Mechanical - 25" through 36" Cover: $1.00/FT
    * TCBP6: Mechanical - 37" through 48" Cover: $1.00/FT
    * TCBP7: Mechanical - Additional Depth in 6" Increments: $0.25/FT

*   ** BURIED PLACEMENT - MISSILE BORE **

    * TCBMB1: Missile Bore - Up to 4.0" OD Bundle: $2.00/FT
    * TCBMB2: Missile Bore - Over 4.0" to 7.0" OD Bundle: $3.00/FT

*   ** BURIED SERVICE WIRE (BSW) **

    * TCBSW3: Buried Service Drop and Duct-Pull: $0.35/FT
    * TCBSW4: Buried Service Drop in Duct-Pull Method: $0.20/FT
    * TCBSW4B: Buried Service Drop in Duct-Blowing Method: $0.30/FT
    * TCBSW5: Buried Service Drop or Microduct: $0.30/FT
    * TCBSW6: Rod and Place Pull Tape in Innerduct for BSW: $0.35/FT
    * TCBSW7: Rod and Slug Innerduct for BSW: $0.40/FT
    * TCBSW8: Locate Conduit End for BSW: $0.07/FT
    * TCBSW9: Handhole Associated with One Fiber BSW: $30.00/EA
    * TCBSW10: Each Additional Drop Same Trench: $0.08/FT
    * TCBSW11: Additional Innerduct up to 2 Inches: $0.30/FT
    * TCBSW12: Each Additional Drop in Innerduct: $0.30/FT
    * TCBSW13: Road/Driveway Bore/Pull (Drop): $3.00/FT
    * TCBSW14: Bore - Each Additional Innerduct: $0.25/FT
    * TCBSW15: Each Buried Drop Facility in Open Path/Trench: $0.12/FT
    * TCBSW16: Intercept Existing Duct: $12.00/EA
    * TCBSW17: Trip Charge - Single/Individual Rate: $14.00/EA
    * TCBSW18: Trip Charge - Crew Rate: $50.00/EA

*   ** BURIED MAINTENANCE & SUPPORT **

    * TCM7: Maintain - Straighten, Raise, or Lower Handhole: $40.00/EA
    * TCM8: Maintain - Dig and Backfill Splice Pit (Up to 30 cu. ft.): $70.00/EA
    * TCM9: Maintain - Dig and Backfill Splice Pit (30-60 cu. ft.): $95.00/EA
    * TCM10: Maintain - Dig and Backfill Splice Pit (Over 60 cu. ft.): $2.50/CUFT
    * TCM11: Maintain - Pothole Existing Buried Facilities: $25.00/EA
    * TCM12: Maintain - Replace Flowerpot or Handhole Lid: $10.00/EA
    * TCM13: Move Charge - Buried: $50.00/EA
    * TCM14: Select Backfill: $1.10/CUFT

*   ** BURIED COMPONENTS & ACCESSORIES **

    * TCMB1: Drop Wire Terminal: $12.00/EA
    * TCMB2: Flowerpot: $12.00/EA
    * TCMB3A: Handhole 13x24x18: $25.00/EA
    * TCMB3B: Handhole 17x30x24: $50.00/EA
    * TCMB3C: Handhole 24x36x24: $55.00/EA
    * TCMB4: Handhole 30x48x36: $90.00/EA
    * TCMB5: Locate Wire - Primary Function: $0.20/FT
    * TCMB6: Locate Wire in Duct - Primary Function: $0.12/FT
    * TCMB7: Locate Wire/Locate Wire in Duct - Secondary Function: $0.08/FT
    * TCMB8: Ground Rod - Primary Function: $10.00/EA
    * TCMB9: Ground Rod System - Primary Function: $18.00/EA
    * TCMB10: Ground Wire: $0.40/FT
    * TCMB11: Ground Rod - Secondary Function: $7.50/EA
    * TCMB12: Relocate Existing Buried Facilities: $1.00/FT
    * TCMB13: Intercept - Encased Conduit (Concrete): $86.00/EA
    * TCMB14: Intercept - Conduit: $0.55/FT
    * TCMB15: Locate - Conduit End: $20.00/EA
    * TCMB16: Asphalt in 6" Depth Increments: $4.00/SQFT
    * TCMB17: Concrete in 6" Depth Increments: $5.00/SQFT
    * TCMB19: Formed Concrete: $7.50/CUYD
    * TCMB20: Unformed Concrete: $7.50/CUYD
    * TCMB21: Dowel Concrete: $9.00/EA
    * TCMB22: Core Bore - Manhole: $60.00/EA
    * TCMB23: Core Bore - Building Entrance: $40.00/EA
    * TCMB24: Pull Line - All Types: $0.07/FT
    * TCMB25: 6x6 Post: $8.00/EA
    * TCMB26: Remote OLT Node in Optmius Pedestal: $37.00/EA
    * TCMB27: Power Meter Base: $30.00/EA
    * TCMB28: Alpha Power Cabinet: $80.00/EA
    * TCMB29: OLT Cabinet: $90.00/EA
    * TCMB30: Equipment and Pad (Up to 10 sq. ft.): $300.00/EA
    * TCMB31: Equipment and Pad (10-30 sq. ft.): $400.00/EA
    * TCMB32: Equipment and Pad (30-50 sq. ft.): $600.00/EA
    * TCMB33: Equipment and Pad (50-100 sq. ft.): $750.00/EA
    * TCMB34: Concrete Pad (Up to 10 sq. ft.): $100.00/EA
    * TCMB35: Concrete Pad (10-30 sq. ft.): $175.00/EA
    * TCMB36: Concrete Pad (30-50 sq. ft.): $300.00/EA
    * TCMB37: Concrete Pad (50-100 sq. ft.): $400.00/EA

*   ** MICRO TRENCHING **

    * TCMT1: Micro Trenching 1"-9": $2.75/FT
    * TCMT2: Micro Trenching 9"-16": $2.75/FT
    * TCMT3: Micro Trenching 16"-26": $2.75/FT

*   ** UNDERGROUND PLACEMENT **

    * TCU1: Cable, Wire, or Pipe in Open Conduit - Pull Method: $0.30/FT
    * TCU1B: Conventional Cable, Wire, or Pipe in Open Conduit - Blowing Method: $0.30/FT
    * TCU3: Additional Cable, Wire, or Pipe Simultaneously: $0.12/FT
    * TCU4: Pull Tape/Wire in Conduit/Innerduct: $0.16/FT
    * TCU5: Additional Pull Tape/Wire in Conduit/Innerduct: $0.10/FT
    * TCU12: Remove Cable, Fiber, Wire, or Pipe: $0.10/FT
    * TCU13: Remove Additional Facility Removed Simultaneously: $0.05/FT
    * TCUB: Micro Uni-tube Fiber Optic Cable in Open Micro Duct - Blowing Method: $0.10/FT
    * TCUB1: Hexatronic Stingray Drop/Cable (2-24 Fibers in 7/3.5mm Microduct) - Blowing Method: $40.00/EA

*   ** ELECTRONICS & TURNUP **

    * TCE1: OLT Cabinet - Placement, Testing & Turnup: $187.50/LOC
    * TCE2: OLT Clam Shell - Placement, Testing & Turnup: $155.00/LOC
    * TCE3: OLT Strand - Placement, Testing & Turnup: $97.50/LOC

*   ** FIBER DISTRIBUTION EQUIPMENT **

    * TCMU1: Placement of FDH/OLT - Vault Mounted: $85.00/EA
    * TCMU2: Placement of FDH/OLT - Pole Mounted: $100.00/EA
    * TCMU3: Placement of FDH/OLT - Wall/Rack Mounted: $100.00/EA
    * TCMU4: Placement of FDH/OLT - Vault/Sub-surface Mounted: $95.00/EA
    * TCMU4A: Turnkey Place/Replace FDH Closure/Swing Arm Mounted: $30.00/EA
    * TCMU5: Placement of FDT - Vault Mounted (FlexNap): $16.00/EA
    * TCMU6: Placement of FDT - Pole Mounted (FlexNap): $18.00/EA
    * TCMU7: Placement of FDT - Wall/Rack Mounted (FlexNap): $16.00/EA
    * TCMU8: Placement of FDT - Vault/Sub-surface Mounted (FlexNap): $16.00/EA
    * TCMU9: Placement of FDT - Building (SFU/MDU/MTU): $30.00/EA

*   ** BOLLARDS & BARRIERS **

    * TCSP1: Placement of Bollard (Materials and Labor Only): $40.00/EA
    * TCSP2: Placement of Bollard (Materials, Labor, and Bollard): $80.00/EA

*   ** SPLICING - CABLE ONLY **

    * TCSS1: Splice - Fiber Optic Loose Tube Cable ≤96 Fibers: $7.00/EA
    * TCSS2: Splice - Fiber Optic Ribbon Cable ≤96 Fibers: $3.00/EA
    * TCSS3: Splice - Fiber Optic Loose Tube Cable >96 Fibers: $6.00/EA
    * TCSS4: Splice - Fiber Optic Ribbon Cable >96 Fibers: $3.00/EA
    * TCSS8: Splicing - Wastewater Removal: $18.00/EA

*   ** SPLICING - TERMINAL CLOSURE **

    * TCSS9: Prep, Splice & Place Terminal Closure (Primary/Secondary) - Ribbon Cable ≤12 Fibers: $48.00/EA
    * TCSS11: Prep, Splice & Place Terminal Closure (Primary/Secondary) - Loose Tube Cable ≤12 Fibers: $48.00/EA
    * TCSSM: Splice Micro Duct at Lateral: $1.50/EA
    * TCSSMD: Splice Micro Duct at Duct Access Point (DAP): $1.50/EA

*   ** FUSION SPLICING (MDU) **

    * TMDU092-A: Fusion Splice - 1 to 15 Splices: $10.00/EA
    * TMDU092-B: Fusion Splice - 16 to 30 Splices: $9.50/EA
    * TMDU092-C: Fusion Splice - 31 to 50 Splices: $8.50/EA
    * TMDU092-D: Fusion Splice - 51 to 99 Splices: $8.50/EA
    * TMDU092-E: Fusion Splice - 100+ Splices: $7.50/EA

*   ** HOURLY RATES - TRUCK DRIVER **

    * TCHR1: CDL Truck Driver - Differential Rate: $15.00/HR
    * TCHR2: CDL Truck Driver - Normal Rate: $12.50/HR
    * TCHR3: CDL Truck Driver - Overtime Rate: $18.75/HR
    * TCHR4: CDL Truck Driver - Natural Disaster Rate (Outside Market Radius): $22.50/HR
    * TCHR5: CDL Truck Driver - Natural Disaster Rate (Within Market Radius): $23.75/HR

*   ** HOURLY RATES - ELECTRICIAN **

    * TCHR6: Electrician - Differential Rate: $30.00/HR
    * TCHR7: Electrician - Normal Rate: $22.50/HR
    * TCHR8: Electrician - Overtime Rate: $33.75/HR
    * TCHR9: Electrician - Natural Disaster Rate (Outside Market Radius): $43.75/HR
    * TCHR10: Electrician - Natural Disaster Rate (Within Market Radius): $38.75/HR

*   ** HOURLY RATES - FLAGGER **

    * TCHR11: Flagger - Differential Rate: $8.75/HR
    * TCHR12: Flagger - Normal Rate: $10.00/HR
    * TCHR13: Flagger - Overtime Rate: $15.00/HR
    * TCHR14: Flagger - Natural Disaster Rate (Outside Market Radius): $18.75/HR
    * TCHR15: Flagger - Natural Disaster Rate (Within Market Radius): $16.25/HR

*   ** HOURLY RATES - GENERAL LABORER **

    * TCHR16: General Laborer - Differential Rate: $12.50/HR
    * TCHR17: General Laborer - Normal Rate: $10.00/HR
    * TCHR18: General Laborer - Overtime Rate: $13.75/HR
    * TCHR19: General Laborer - Natural Disaster Rate (Outside Market Radius): $18.75/HR
    * TCHR20: General Laborer - Natural Disaster Rate (Within Market Radius): $16.25/HR

*   ** HOURLY RATES - JOURNEYMAN **

    * TCHR21: Journey Man - Differential Rate: $27.50/HR
    * TCHR22: Journey Man - Normal Rate: $25.00/HR
    * TCHR23: Journey Man - Overtime Rate: $37.50/HR
    * TCHR24: Journey Man - Natural Disaster Rate (Outside Market Radius): $47.50/HR
    * TCHR25: Journey Man - Natural Disaster Rate (Within Market Radius): $37.50/HR

*   ** HOURLY RATES - LINEMAN **

    * TCHR26: Lineman - Differential Rate: $18.75/HR
    * TCHR27: Lineman - Normal Rate: $17.50/HR
    * TCHR28: Lineman - Overtime Rate: $26.25/HR
    * TCHR29: Lineman - Natural Disaster Rate (Outside Market Radius): $41.25/HR
    * TCHR30: Lineman - Natural Disaster Rate (Within Market Radius): $28.75/HR

*   ** HOURLY RATES - MACHINE OPERATOR **

    * TCHR31: Machine Operator - Differential Rate: $17.50/HR
    * TCHR32: Machine Operator - Normal Rate: $15.00/HR
    * TCHR33: Machine Operator - Overtime Rate: $21.25/HR
    * TCHR34: Machine Operator - Natural Disaster Rate (Outside Market Radius): $36.25/HR
    * TCHR35: Machine Operator - Natural Disaster Rate (Within Market Radius): $28.75/HR

*   ** HOURLY RATES - SKILLED LABORER **

    * TCHR41: Skilled Laborer - Differential Rate: $17.00/HR
    * TCHR42: Skilled Laborer - Normal Rate: $15.00/HR
    * TCHR43: Skilled Laborer - Overtime Rate: $21.25/HR
    * TCHR44: Skilled Laborer - Natural Disaster Rate (Outside Market Radius): $28.75/HR
    * TCHR45: Skilled Laborer - Natural Disaster Rate (Within Market Radius): $22.50/HR

*   ** HOURLY RATES - SPLICER **

    * TCHR46: Splicer - Differential Rate: $22.50/HR
    * TCHR47: Splicer - Normal Rate: $20.00/HR
    * TCHR48: Splicer - Overtime Rate: $28.87/HR
    * TCHR49: Splicer - Natural Disaster Rate (Outside Market Radius): $40.00/HR
    * TCHR50: Splicer - Natural Disaster Rate (Within Market Radius): $31.25/HR

*   ** HOURLY RATES - SUPERVISOR **

    * TCHR51: Supervisor - Differential Rate: $25.00/HR
    * TCHR52: Supervisor - Normal Rate: $21.25/HR
    * TCHR53: Supervisor - Overtime Rate: $30.00/HR
    * TCHR54: Supervisor - Natural Disaster Rate (Outside Market Radius): $36.25/HR
    * TCHR55: Supervisor - Natural Disaster Rate (Within Market Radius): $31.25/HR

*   ** PER DIEM & DAILY RATES **

    * TCHR61: Per Diem Rate - Natural Disaster (Outside Market Radius): $43.00/DAY

*   ** EQUIPMENT RATES - TRAFFIC CONTROL **

    * TCHR62: Traffic Barrel - Hourly: $1.50/HR
    * TCHR63: Traffic Barrel - Daily: $5.00/DAY
    * TCHR64: Traffic Barrel - Weekly: $23.75/WK
    * TCHR65: Work Zone Sign - Hourly: $1.50/HR
    * TCHR66: Work Zone Sign - Daily: $7.00/DAY
    * TCHR67: Work Zone Sign - Weekly: $23.75/WK
    * TCHR68: Traffic Cones - Hourly: $0.75/HR
    * TCHR69: Traffic Cones - Overtime (Hourly): $1.25/HR
    * TCHR70: Traffic Cones - Daily: $5.00/DAY
    * TCHR71: Traffic Cones - Overtime (Daily): $5.00/DAY
    * TCHR72: Traffic Cones - Weekly: $25.00/WK

*   ** EQUIPMENT RATES - STRUCTURAL **

    * TCHR73: Steel Plate - Daily: $31.25/DAY
    * TCHR74: Steel Plate - Weekly: $30.00/WK
    * TCHR75: Steel Plate - Monthly: $62.50/MO
    * TCHR83: Concrete Barriers - Daily: $18.75/DAY
    * TCHR84: Concrete Barrier - Weekly: $16.25/WK
    * TCHR85: Concrete Barrier - Monthly: $67.50/MO

*   ** VEHICLE RATES **

    * TCHR76: Large Vehicle - Hourly: $25.00/HR
    * TCHR77: Medium Vehicle - Hourly: $18.75/HR
    * TCHR78: Small Vehicle - Hourly: $10.00/HR

*   ** EQUIPMENT RATES - OPERATIONAL **

    * TCHR79: Large Equipment - Hourly: $31.25/HR
    * TCHR80: Medium Equipment - Hourly: $25.00/HR
    * TCHR81: Small Equipment (Other) - Hourly: $23.75/HR
    * TCHR82: Small Mechanical Equipment (Hand-held) - Hourly: $8.75/HR

*   ** MDU/TURNKEY CONSTRUCTION - TWO STEP (With Entry to LU) **

    * TMDULU-001-A: MDU 1-15 Units: $65.00/LU
    * TMDULU-001-B: MDU 16-30 Units: $62.00/LU
    * TMDULU-001-C: MDU 31-50 Units: $52.00/LU
    * TMDULU-001-D: MDU 51-99 Units: $50.00/LU
    * TMDULU-001-E: MDU 100+ Units: $45.00/LU

*   ** MDU/TURNKEY CONSTRUCTION - ONE STEP (With Entry to LU) **

    * TMDULU-002-A: MDU 1-15 Units: $62.00/LU
    * TMDULU-002-B: MDU 16-30 Units: $60.00/LU
    * TMDULU-002-C: MDU 31-50 Units: $49.00/LU
    * TMDULU-002-D: MDU 51-99 Units: $47.00/LU
    * TMDULU-002-E: MDU 100+ Units: $45.00/LU

*   ** MDU/TURNKEY CONSTRUCTION - TWO STEP (No Entry to LU) **

    * TMDULU-004-A: MDU 1-15 Units: $49.00/LU
    * TMDULU-004-B: MDU 16-30 Units: $49.00/LU
    * TMDULU-004-C: MDU 31-50 Units: $42.00/LU
    * TMDULU-004-D: MDU 51-99 Units: $42.00/LU
    * TMDULU-004-E: MDU 100+ Units: $41.00/LU

*** MDU/TURNKEY CONSTRUCTION - ONE STEP (No Entry to LU) **

    * TMDULU-005-A: MDU 1-15 Units: $46.00/LU
    * TMDULU-005-B: MDU 16-30 Units: $46.00/LU
    * TMDULU-005-C: MDU 31-50 Units: $40.00/LU
    * TMDULU-005-D: MDU 51-99 Units: $40.00/LU
    * TMDULU-005-E: MDU 100+ Units: $39.00/LU

*   ** MDU/TURNKEY CONSTRUCTION - TWO STEP (Half Fee Incomplete) **

    * TMDULU-006-A: MDU 1-15 Units: $32.00/LU
    * TMDULU-006-B: MDU 16-30 Units: $31.00/LU
    * TMDULU-006-C: MDU 31-50 Units: $27.00/LU
    * TMDULU-006-D: MDU 51-99 Units: $25.00/LU
    * TMDULU-006-E: MDU 100+ Units: $23.00/LU

*   ** MDU/TURNKEY CONSTRUCTION - ONE STEP (Half Fee Incomplete) **

    * TMDULU-007-A: MDU 1-15 Units: $31.00/LU
    * TMDULU-007-B: MDU 16-30 Units: $30.00/LU
    * TMDULU-007-C: MDU 31-50 Units: $24.00/LU
    * TMDULU-007-D: MDU 51-99 Units: $24.00/LU
    * TMDULU-007-E: MDU 100+ Units: $23.00/LU

*   ** MDU/TURNKEY CONSTRUCTION - TWO STEP (Greenfield) **

    * TMDULU-008-A: MDU 1-15 Units: $57.00/LU
    * TMDULU-008-B: MDU 16-30 Units: $54.00/LU
    * TMDULU-008-C: MDU 31-50 Units: $49.00/LU
    * TMDULU-008-D: MDU 51-99 Units: $47.00/LU
    * TMDULU-008-E: MDU 100+ Units: $43.00/LU

*   ** MDU/TURNKEY CONSTRUCTION - ONE STEP (Greenfield) **

    * TMDULU-009-A: MDU 1-15 Units: $54.00/LU
    * TMDULU-009-B: MDU 16-30 Units: $52.00/LU
    * TMDULU-009-C: MDU 31-50 Units: $46.00/LU
    * TMDULU-009-D: MDU 51-99 Units: $45.00/LU
    * TMDULU-009-E: MDU 100+ Units: $41.00/LU

*   ** MDU SUPPORT SERVICES **

    * TEMDU-011: MDU Meetings: $19.00/HR
    * TMDULU-003: MDU Preparation Per Floor: $176.00/FL
    * TMDULU-022: Security Adder: $32.00/LU

*   ** MDU/DRYWALL & MOLDING WORK **

    * TMDU094-A: Remove Molding (1-15 Units): $5.00/LU
    * TMDU094-B: Remove Molding (16-30 Units): $4.00/LU
    * TMDU094-C: Remove Molding (31-50 Units): $4.00/LU
    * TMDU094-D: Remove Molding (51-99 Units): $3.00/LU
    * TMDU094-E: Remove Molding (100+ Units): $3.00/LU
    * TMDU095-A: Place New Molding (Standard): $0.70/FT
    * TMDU095-B: Place New Molding (Reduced): $0.35/FT
    * TMDU096-A: Drywall Repair 8"x8" to 12"x12" (1-9 Cut-outs): $14.00/EA
    * TMDU096-B: Drywall Repair 8"x8" to 12"x12" (10+ Cut-outs): $12.00/EA
    * TMDU096-C: Drywall Repair 13"x13" to 18"x18" (1-9 Cut-outs): $16.00/EA
    * TMDU096-D: Drywall Repair 13"x13" to 18"x18" (10+ Cut-outs): $13.00/EA

*   ** CORE BORE SERVICES (Small Holes: ≤2.5") **

    * TMDU-013-A: Core Bore - Below 2.5" Diameter (>12" Material, 1-9 Holes): $32.00/EA
    * TMDU-014-A: Core Bore - Below 2.5" Diameter (>12" Material, 10+ Holes): $27.00/EA

*   ** CORE BORE SERVICES (Medium Holes: 2.5"-4.0") **

    * TMDU-013: Core Bore - 2.5" to 4.0" Diameter (≤24" Material, 1-9 Holes): $32.00/EA
    * TMDU-014: Core Bore - 2.5" to 4.0" Diameter (≤24" Material, 10+ Holes): $27.00/EA
    * TMDU-021: Core Bore - 2.5" to 4.0" Diameter (24.1"-36.0" Material, 1-9 Holes): $35.00/EA
    * TMDU-022: Core Bore - 2.5" to 4.0" Diameter (24.1"-36.0" Material, 10+ Holes): $30.00/EA
    * TMDU-029: Core Bore - 2.5" to 4.0" Diameter (>36.1" Material, 1-9 Holes): $45.00/EA
    * TMDU-030: Core Bore - 2.5" to 4.0" Diameter (>36.1" Material, 10+ Holes): $42.00/EA

*   ** CORE BORE SERVICES (Large Holes: 4.1"-5.0") **

    * TMDU-015: Core Bore - 4.1" to 5.0" Diameter (≤24" Material, 1-9 Holes): $34.00/EA
    * TMDU-016: Core Bore - 4.1" to 5.0" Diameter (≤24" Material, 10+ Holes): $30.00/EA
    * TMDU-023: Core Bore - 4.1" to 5.0" Diameter (24.1"-36.0" Material, 1-9 Holes): $44.00/EA
    * TMDU-024: Core Bore - 4.1" to 5.0" Diameter (24.1"-36.0" Material, 10+ Holes): $41.00/EA
    * TMDU-031: Core Bore - 4.1" to 5.0" Diameter (>36.1" Material, 1-9 Holes): $50.00/EA
    * TMDU-032: Core Bore - 4.1" to 5.0" Diameter (>36.1" Material, 10+ Holes): $48.00/EA

*   ** MDU ADDITIONAL SERVICES **

    * TMBT: Place Hexatronic Yard Chamber/Toby2 Box: $10.00/EA
    * TMDU-047: Place Terminal Box/Equipment/Storage Box: $7.00/EA
    * TMDU-050A: Place Electrical Conduit EMT (With Turnkey Units): $1.50/FT
    * TMDU-050B: Place Electrical Conduit EMT (Without Turnkey Units): $2.50/FT
    * TMDU-054: Hand Rodding/Blown in Occupied Duct: $0.10/FT
    * TMDU-055: Hand Rodding/Blown in Un-occupied Duct: $0.00/FT
    * TMDU-066: Place Additional Wire/Cable/Fiber/Innerduct: $0.10/FT
    * TMDU-069: Place Backboard & Provide Entrance Hole: $28.00/EA
    * TMDU-075: Trip Charge (Crew Rate - 2 Men): $30.00/EA
    * TMDU-076: Install Smooth Wall Innerduct: $0.70/FT

*   ** GROUND PENETRATING RADAR SURVEY **

    * TMDU-091: GPR Survey (1-9 Scans): $66.00/SCAN
    * TMDU-092: GPR Survey (10+ Scans): $55.00/SCAN

## SECTION 7: CLOSEOUT & INVOICING REQUIREMENTS
*   **Photo Deliverables**:
    *   Start of Day/End of Day Site Photos.
    *   Depth Verification Photos (Tape measure in trench/bore pit).
    *   Running Line Verification (Tracer wire/Locate paint visible).
    *   Restoration Photos (Before/During/After).
    *   Vault Interior Photos (Racking, Bonding, Cleanliness).
    *   Pedestal/Cabinet Interior Photos.
*   **Document Deliverables**:
    *   Redline Drawings (As-Builts) - Must match actual footage.
    *   Bore Logs (Drill shots).
    *   Test Results (OTDR/Power Meter) - Raw & PDF formats.
    *   Material Reconciliation Form.
    *   Invoices must reference the specific NTP and PO numbers.

## SECTION 8: UTILITY LOCATES & DAMAGE PREVENTION
*   **811 Policy**: "Call Before You Dig" - Ticket must be active and valid.
*   **Ticket Life**: Generally 30 days (state dependent). Renewal required if expired.
*   **Tolerance Zone**: 24 inches (approx) from outer edge of utility markings. Hand dig only in this zone.
*   **Positive Response**: Check 811 system for utility responses (Clear/Marked/Conflict) before digging.
*   **Damages**: Stop work immediately. Secure the area. Notify Supervisor and Utility Owner. Take photos with provided damage hit kit.

## SECTION 9: SAFETY & COMPLIANCE
*   **PPE**: Hard hat, safety vest (Class 2/3), steel-toe boots, safety glasses required at all times.
*   **Traffic Control**: MUTCD standards must be followed for lane closures/shoulder work.
*   **Tailgate Meetings**: Daily safety briefing required before work starts.

## SECTION 10: FILE NAMING & REPORTING PROCEDURES
*   **Project Naming Convention**: All files should generally follow: \`Date, Document Type, Project Name\`.
*   **EOS (End of Shift) Report**: Format: \`Date, End Of Day Shift Report, Project Name, Vendor\`.
*   **Redline Report / As-Builts**: Format: \`Date, Redline Report followed by the Project Name, Sheet Number\`.
*   **QC Checklist**: Format: \`Date, Project Name, QC Checklist\` (Note: Do not put the QC Inspector name in the file name).
*   **Zip Files (Master)**: Contains EOS, Redlines, Toby Box Pictures, Hand Hole Pictures, Daps, etc.
    *   Format: \`Date, Redline Report, Project Name\`.
*   **Zip Files (Pictures)**: Specific picture sets.
    *   Format: \`Date, Project Name, Type of Picture(Toby, Dap, Hand Hole Etc)\`.
*   **SiteTracker Upload Process (Biz Ops)**:
    *   EOS information is uploaded into the **Forms** section of SiteTracker (upper right-hand side).
    *   Steps:
        1. Click **New**.
        2. Select Form Template: **Underground work shift** OR **Fiber work shift** (if fiber placement).
        3. Enter drill footage/Fiber cable and material used.
        4. Click **Save**.
        5. Click on the created work shift form to enter all remaining information.
*   **Submission**: Your redlines and all other information combined in one zip file should be sent to **Tillman Production**.

## SECTION 11: PRODUCTION SUBMISSION & APPROVAL FOR SUBCONTRACTOR INVOICING
*   **Daily Submission**: Production should be submitted daily so it can be Level 1 and 2 approved daily. If it is not, we cannot guarantee that all production will be Level 2 approved by the pay close cut off.
    *   Steps:
        1. Goto [Penguin Data](https://fullcircle.penguindata.com/login).
        2. Enter your username and password.
        3. Choose Standard and click Sign in.
        4. Make sure you are in the correct office enviroment in the top left of the screen. (e.g. Clearwater, Polk, Manatee, Citruss, Miami)
        5. Click on the Projects link on the top of the screen.
        6. Click on Project Data and choose Manage Project.
        7. Look for the Functions button on the top right of the screen and click it.
        8. In the search drop down type the name of your project and click search. (e.g. BHT-FOE-03)
        9. A popup will appear with the project and its associated tasks.
        10. Click on the task name you would like to submit or approve production for. Phase 1 is for Construction Production and Phase 2 is for Fiber Production.
        11. Verify the subcontractor's backup on the Forms tab.
        12. Click the Billing Tab and verify Pending Mobile Entered Codes. If there are any codes listed here for approval you must select the Save checkbox.
        13. Once you have selected all the billing codes you will be approving, scroll to the bottom of the screen and click the Submit Button.

*   **Documentation Required**: No production should be entered or approved at the Level 1 stage unless **all** accompanying documentation, including all pictures, have been uploaded onto the task on the FORMS tab.
*   **Task Assignment**:
    *   All **construction** work falls on the **Phase 1** task.
    *   All **fiber** work falls on the **Phase 2** task.
*   **Friday Backdating**: On Fridays, you must **back date** the production when Level 1 approving to the day before (Thursday), since Thursday is the end of the pay period.
*   **Missing Projects**: If you attempt to assign a sub/tech to a project and cannot find the project, reach out to **Tillman Production** immediately to get the project entered ASAP.

## SECTION 12: UTILITY LOCATE TICKET REQUESTS (NEW)
*   **Purpose**: Standardized procedure for submitting utility locate requests in Tillman FTTH builds. Goal: Ensure all underground utilities are marked to prevent damage and ensure safety.
*   **Roles & Responsibilities**:
    *   **Vendor's Management**: Ensures complete/accurate tickets, tracks status, ensures safety compliance.
    *   **Sub-Contractor**: Submits tickets, compliance with Tillman-USIC agreement.
    *   **Construction Crew**: Adheres to markings, follows safety guidelines, reports discrepancies.
    *   **Tillman PM**: Facilitates priority jobs and obstacles.
*   **Required Information**:
    *   Email Contacts, Project Affiliation ("Tillman Fiber"), Job Name (e.g., FB-HDH02A), Footage.
    *   Detailed Site Info (street names, intersections), Work Type (boring, trenching), Excavation Method, Depth.
    *   Proposed Start Date/Time, Point of Contact (name/phone).
*   **Communication Protocol**:
    *   **Subcontractors**: CANNOT contact locators for prioritization.
    *   **Vendors**: Can communicate with USIC only to answer questions/resolve issues.
    *   **Tillman Fiber**: ONLY Tillman has authority to request job prioritization.
    *   Do NOT use terms like "Do not delay" or "High priority" on tickets.
*   **Submission Guidelines**:
    *   **Daisy Chain**: Build sequentially (1.1 -> 1.2 -> 1.3).
    *   **Feeder**: Start from Active Cabinet.
    *   **Logical Prioritization**: Follow network build progression.
    *   **Batch Requests**: Submit multiple tickets for contiguous areas.
*   **Procedure**:
    *   **Step 1**: White line area. Contact One-Call (811) 1 week prior. Obtain ticket #.
    *   **Step 2**: Verify ticket details. Maintain log (status/expiration). Ensure ticket remains valid.
    *   **Step 3**: Distribute info to PM/Construction Manager. Ensure markings are in place. Pothole if discrepancies found.
    *   **Step 4 (Compliance)**: Markings visible until completion. Close ticket with One-Call. Retain records.
*   **Safety**:
    *   PPE required (vest, gloves, boots).
    *   Be aware of hazards (gas, HV lines).
    *   **MANDATORY**: Potholing/physically identifying all marked utilities prior to drilling.
*   **Rollback Plan**:
    *   If locate is incorrect/incomplete: **HALT** excavation immediately.
    *   Contact One-Call for emergency re-locate.
    *   Notify Project Manager.

## SECTION 13: INSPECTOR TRAINING & DAILY CHECKLIST
*   **Purpose**: Guidance for consistent quality, safety, and documentation.
*   **Responsibilities**: Ensure work meets safety standards, follows specs, documentation is accurate, report issues.
*   **Daily Workflow**:
    *   **Morning**: Review docs, verify PPE/equipment (Camera with Timestamp App, checklist, measuring tools), meet contractor, document starting conditions, verify permits/locates, site safety assessment.
    *   **Mid-Day (10:00 AM)**: Complete first redline report, send to Supervisor, document progress.
    *   **End-of-Day**: Verify work meets specs, site cleanup, final documentation, report issues to CM.
*   **Walk Wheel Measurement Protocol (MANDATORY)**:
    *   Walk wheeled by both supervisors and inspectors.
    *   Completed page by page.
    *   Document ALL DAP locations.
    *   **Photos**: Wheel at 0 (start) and wheel at end measurement using Timestamp App.
    *   **Deliverable**: Updated red line maps with correct footage, uploaded to "Walked out As-builts Maps" folder (project-specific subfolder).
*   **Daily Inspection Checklist**:
    *   **Safety**: Traffic cones, warning signs, PPE, safe parking, hazard check.
    *   **Procedure**: Locates verified, video of entire job, "Before" photos, permits accessible, utilities potholed, pits verified at 3' depth.
    *   **Redline**: Morning meeting, 10AM report, Toby boxes checked (2-way access/trace wire), DAP placement verified.
    *   **QC & Restoration**: Drills use plywood, job briefing, site cleanup, restoration requirements met.
*   **Common Issues**:
    *   **Locate Delays**: Notify supervisor, document area, do not proceed without locates.
    *   **Utility Conflicts**: Stop work, document, notify supervisor.
    *   **Documentation**: Be thorough, take extra photos, use consistent naming, back up daily.

## SECTION 14: TIMESTAMP CAMERA SETUP
*   **Requirement**: Customize photo names based on project and sheet number.
*   **Steps**:
    1.  Click clock icon (bottom right).
    2.  Click "Advanced".
    3.  Click "File name format".
    4.  Choose option starting with \`custom-input-text_\`.
    5.  Return to main screen, click clock icon again.
    6.  Click "Display custom text on camera".
    7.  Input format: \`ProjectName-Sheet#-Type of Picture(Toby, Dap, Hand Hole Etc)\` (e.g., \`D-HDH60-Sheet5-Toby\`).
*   **Note**: Update this number when moving to a new sheet. All photos will autosave as \`ProjectName-Sheet#-Type of Picture(Toby, Dap, Hand Hole Etc)_DateTime.jpg\`.

## SECTION 15: IMPORTANT LINKS
1.  **Tillman Project SharePoint**: [SharePoint](https://lightspeedconstructiongroup.sharepoint.com/sites/ClearwaterSupervisors/SitePages/ProjectHome.aspx)
2.  **Project Summary Data**: [Project Summary](https://lightspeedconstructiongroup.sharepoint.com/:x:/s/SoutheastRegion-TillmanFiberProject/ETFA0lynl1BPjXCjpf5ujnIB8_SxhhTuIUXyBj_mezjgoA?e=LTUMSD&web=1)
3.  **Locate Ticket Tracker**: [Locate Tracker](https://lightspeedconstructiongroup.sharepoint.com/:x:/s/SoutheastRegion-TillmanFiberProject/EdvfutoSOu1GjODYhk1aFEkBbm3WQj1UA2VCNUdg71tj3Q?e=0eslHQ&web=1)
4.  **Restoration Tracker**: [Restoration Tracker](https://lightspeedconstructiongroup-my.sharepoint.com/:x:/g/personal/betsy_montero_lscg_com/EbghxuQJnjRNucEyZM0IyyQB3FgqYjmPNcwh3KO4UXYYSw?e=ZJzShy&nav=MTVfezAwMDAwMDAwLTAwMDEtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMH0)
5.  **Project Dashboard**: [Dashboard](https://jckraus1.github.io/Tillman-Dashboard/Tillman%20Dashboard.html)
6.  **Share Drive (Maps/Docs)**: [Share Drive](https://lightspeedconstructiongroup.sharepoint.com/sites/SoutheastRegion-TillmanFiberProject/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FSoutheastRegion%2DTillmanFiberProject%2FShared%20Documents%2FTillman%20Fiber%20Project)
7.  **Sunshine 811 (Locate Tickets)**: [Sunshine 811](https://exactix.sunshine811.com/login)
8.  **Sunshine 811 Training**: [Sunshine 811 Training](https://sunshine811.com/full-ite-access)
9.  **Penguin Data (Billing)**: [Penguin Data](https://fullcircle.penguindata.com/login)
10. **OneStepGPS (Vehicle Tracking)**: [OneStepGPS](https://track.onestepgps.com/v3/auth/login?r=https://track.onestepgps.com/v3/ux/map)

## SECTION 16: MANDATORY LINKING RULES
*   **Contractor and Subcontractor Invoicing And Production**: ALWAYS provide this link: [Penguin Data](https://fullcircle.penguindata.com/login)
*   **Maps / Asbuilts / End of Shifts (EOS)**: ALWAYS provide this link: [Share Drive](https://lightspeedconstructiongroup.sharepoint.com/sites/SoutheastRegion-TillmanFiberProject/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FSoutheastRegion%2DTillmanFiberProject%2FShared%20Documents%2FTillman%20Fiber%20Project)
*   **Project Specifics**: When answering about specific project details (status, cost, etc.), ALWAYS include this link: [Project Summary Data](https://lightspeedconstructiongroup.sharepoint.com/:x:/s/SoutheastRegion-TillmanFiberProject/ETFA0lynl1BPjXCjpf5ujnIB8_SxhhTuIUXyBj_mezjgoA?e=LTUMSD&web=1)
*   **Locates / Digging**: When answering about locates, ALWAYS include these links: [Sunshine 811](https://exactix.sunshine811.com/login), [Locate Tracker](https://lightspeedconstructiongroup.sharepoint.com/:x:/s/SoutheastRegion-TillmanFiberProject/EdvfutoSOu1GjODYhk1aFEkBbm3WQj1UA2VCNUdg71tj3Q?e=0eslHQ&web=1)
`;

      
      const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Add Language instruction modification here
      let languageInstruction = '';
      if (language === 'es') {
          languageInstruction = `\n\nCRITICAL LANGUAGE INSTRUCTION: The user has selected SPANISH language. You MUST answer all questions in Spanish (Español). Translate your knowledge base information, procedures, and conversational responses into Spanish. HOWEVER, you must keep specific technical identifiers exactly as they appear in the source data (e.g. "NTP Number", "BOM", "SOW", Ticket Numbers like "324501377", Project IDs). Do not translate the technical acronyms themselves, but explain them in Spanish if needed.`;
      }

      const systemInstruction = `You are a knowledgeable AI assistant for Tillman Fiber and Lightspeed Construction Group.
Current Date: ${currentDate}

CRITICAL DATA AVAILABILITY STATUS:
${projectData && projectData.length > 0 ? "ONLINE - Project Data Available" : "OFFLINE - NO PROJECT DATA"}

CRITICAL INSTRUCTIONS:
1.  **IF PROJECT DATA IS OFFLINE**: You MUST NOT answer questions about specific project numbers, status, or supervisors.
2.  **IF PROJECT DATA IS ONLINE**: Use the "LIVE PROJECT DATA" section to answer.
3.  **Real-Time Data**: You have access to Google Search and Google Maps tools. Use them to find current weather, verify location data, or look up recent news affecting construction.
4.  **Geolocation**: If the user asks about "this area" or "local weather", use the provided latitude/longitude in the tool config.
5.  **Procedures**: Always use the knowledge base for procedure questions (BOM, NTP, Safety, etc.) regardless of data status.
6.  **No Hallucinations**: NEVER invent project details. If a project isn't in the list, say so.
7.  **Tone**: Professional but friendly.
8.  **Identity**: You are **Nexus**, the LSCG Tillman AI Assistant. **Do not start every response by stating your name. Only state it if asked.**
9.  **Linking**: You MUST use Markdown [Title](URL) for links.
10. **Locate Tickets Formatting**: When asked for locate tickets, you **MUST** use the following specific bulleted format for every ticket:
    *   **Tickets:** [Ticket Number], Phone: [Phone Number], Status: [Status], Due: [Due Date], Expires: [Expire Date]
11. **Rate Cards**: Distinguish between the "Standard Rate Card" (Internal), "Subcontractor Rate Card" (External), and "Employee Rate Card" (Internal). If a user asks for a rate, check all and clarify the difference.
12. **Roles**: Mention responsible roles (Project Coordinator, PM, etc.).
13. **Specifics**: Cite exact timelines (e.g., 7 days restoration) and specs (e.g., 24" depth).
14. **New Data Fields**: 
    *   **HHP**: Refers to "Serviceable Addresses" or "Households Passed".
    *   **SOW Estimated Cost**: The estimated cost for the project.
    *   **On Track or In Jeopardy**: The health status of the project.
15. **LINKING RULES**: You **MUST** use Markdown format [Title](URL) for all links. Follow the mandatory linking rules in Section 16 of the Knowledge Base.
16. **Locate Formatting**: **NEVER use Markdown Tables**. When listing locate tickets, use simple bullet points or a clear, vertical list. Use the phrase "Sunshine 8 1 1" (with spaces) when speaking, but "Sunshine 811" in text.
17. **Math & Totals**: The "LIVE PROJECT DATA" contains footage totals per supervisor. **Always use these provided totals.** Do NOT attempt to manually add up long lists of numbers in your head, as this may lead to calculation errors. If a user asks for a total, refer to the provided summary first.
18. **Data Sources**:
    *   **Footage Remaining Data**: STRICTLY derived from the "Footage Remaining" column in the project file. If empty, fall back to "Footage UG". NEVER use footage data from locate tickets.
    *   **Locate Tickets**: Sourced from the locate tickets file. You must output the Ticket Number provided in the data. If the data says "Tickets: 324501377", output that number.
    *   **Total Footage Data**: STRICTLY derived from the "Footage UG" column in the project file. NEVER use footage data from locate tickets.

${languageInstruction}

KNOWLEDGE BASE & LIVE PROJECT DATA:
${knowledgeBase}`;

      const toolConfig: any = {};
      if (userLocation) {
        toolConfig.retrievalConfig = {
            latLng: {
                latitude: userLocation.lat,
                longitude: userLocation.lng
            }
        };
      }

      const response = await aiRef.current.models.generateContent({
        model: 'gemini-2.5-flash-lite',
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
        groundingChunks: groundingChunks,
        projectContext: matchedProject // Attach project data for rich card rendering
      };

      setMessages([...updatedMessages, assistantMessage]);
      
      if (autoSpeak && text) {
        speakText(text);
      }
    } catch (error: any) {
      console.error('Error getting response:', error);
      let errorMsg = `I apologize, but I encountered an error: ${error.message || error}.`;
      const errorMessage = { role: 'assistant', content: errorMsg };
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
    "What is the naming convention for the photos?"
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#383e4b] to-[#000000] to-50% sm:to-100% bg-cover">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#383e4b] to-[#000000] text-white p-4 shadow-lg header-buttons flex-none sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
             <div className="h-10 w-auto flex items-center justify-center">
                <img src="https://jckraus1.github.io/LSCG-Tillman-Ai/LSCG_Logo_White_transparentbackground.png" alt="LSCG Logo" className="h-10 w-auto object-contain" />
                <img src="https://jckraus1.github.io/LSCG-Tillman-Ai/nexus-logo-master.png" alt="LSCG Logo" className="h-10 w-auto object-contain" />
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
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
              <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-5 py-3 shadow-sm message-bubble ${message.role === 'user' ? 'bg-blue-600 text-white user-message rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 assistant-message rounded-bl-none'}`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                   {message.role === 'assistant' ? renderMessageContent(message) : message.content}
                </div>
                
                {message.role === 'assistant' && idx === messages.length - 1 && !isLoading && (
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