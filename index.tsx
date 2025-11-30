import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// Define window interfaces for external libraries and APIs
declare global {
  interface Window {
    XLSX: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

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
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm Nexus your LSCG Tillman AI Assistant. I can answer questions about project procedures, rate cards, closeout requirements, utility locates, and more. I also have access to live project data. You can type your question or click the microphone to speak. How can I help you today?"
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
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  
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

  // Initialize speech recognition and synthesis
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      setAvailableVoices(voices);

      // Load preference from localStorage
      const savedVoice = localStorage.getItem('tillman_assistant_voice');
      
      if (savedVoice && voices.some(v => v.name === savedVoice)) {
        setSelectedVoiceName(savedVoice);
      } else {
        // Default Logic: Moira -> Victoria -> Samantha -> First Female -> Default
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
      recognitionRef.current.interimResults = true; // IMPORTANT: Set to true to see text while speaking
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        // Iterate through results to handle interim vs final
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            // If we have a final result, we can optionally auto-send or just set state
            setInputText(finalTranscript);
            setIsListening(false);
          } else {
            // Show interim results in input box
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDashboard]);

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
    const utterance = new SpeechSynthesisUtterance("Voice updated. I am Nexus.");
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
      // Updated URL for Locate Tickets
      const locateExcelUrl = 'https://jckraus1.github.io/Tillman-Dashboard/locate-tickets.xlsx';
      
      console.log(`Fetching Excel files...`);
      
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
            
            // Strict Check for "Master" sheet
            const locateSheetName = locateWorkbook.SheetNames.find((name: string) => 
                name.toLowerCase().includes('master')
            );
            
            if (locateSheetName) {
                console.log(`✅ Found Locate Sheet: ${locateSheetName}`);
                const locateSheet = locateWorkbook.Sheets[locateSheetName];
                const locateRawData: any[] = window.XLSX.utils.sheet_to_json(locateSheet, { raw: false, defval: '' });
                
                locateRawData.forEach(row => {
                    const mapNum = row['Map #']; // Key mapping
                    if (mapNum) {
                        const key = String(mapNum).trim();
                        locateMap[key] = row;
                    }
                });
                console.log(`✅ Loaded ${Object.keys(locateMap).length} locate records.`);
            } else {
                console.warn("⚠️ 'Master' sheet not found in Locate Tickets file. Available sheets:", locateWorkbook.SheetNames);
            }

         } catch (e) {
             console.error("Error parsing locate tickets:", e);
         }
      }

      // --- PARSE PROJECT DATA ---
      let allData: any[] = [];
      
      if (projectResponse && projectResponse.ok) {
        const arrayBuffer = await projectResponse.arrayBuffer();
        console.log('✅ Project Excel downloaded');
        
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
                
                let market = ntpKey.replace("NTP Number", "").trim();
                if (!market) market = "General";

                // Merge Locate Data if available
                const ntpStr = String(ntpValue || '').trim();
                const locateInfo = locateMap[ntpStr] || null;

                return {
                ...row,
                'NTP Number': ntpValue,
                'Market': market,
                'LocateInfo': locateInfo // Attach locate data to project
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
      console.log('✅ Project data loaded successfully:', allData.length, 'rows');
      
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
      console.log('🔄 Auto-refreshing project data...');
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
    // 1. Remove Markdown links but keep title: [Title](URL) -> Title
    let clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // 2. Handle specific acronym pronunciation
    clean = clean.replace(/\bCOP\b/g, "C O P");
    clean = clean.replace(/\bSOW\b/g, "S O W");
    clean = clean.replace(/\be\.g\./g, "Example"); // Handle e.g. -> Example
    clean = clean.replace(/\bNTP\b/g, "N T P");
    clean = clean.replace(/\bPO\b/g, "P O");
    clean = clean.replace(/\bBOM\b/g, "B O M");
    clean = clean.replace(/\bEOS\b/g, "E O S");

    // 3. Basic cleanup
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
    
    // Use selected voice from state
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

  // Helper to render message content with clickable links
  const renderMessageContent = (content: string) => {
    // Regex to match Markdown links: [Title](URL)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      // Push text before the link
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // Push the link component
      const title = match[1];
      const url = match[2];
      parts.push(
        <a 
          key={match.index} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline font-medium"
          onClick={(e) => e.stopPropagation()} // Prevent bubbling issues
        >
          {title}
        </a>
      );
      
      lastIndex = linkRegex.lastIndex;
    }
    
    // Push remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  const sendMessage = async (messageText = inputText) => {
    if (!messageText.trim() || isLoading) return;

    if (!aiRef.current) {
      setApiKeyError(true);
      const errorMessage = {
        role: 'assistant',
        content: `I cannot connect to the AI service because the API Key is missing. Please check your configuration.`
      };
      setMessages([...messages, { role: 'user', content: messageText }, errorMessage]);
      return;
    }

    const userMessage = { role: 'user', content: messageText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      let projectDataContext = '';
      
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
          const totalFootage = projects.reduce((sum: number, p: any) => {
            const footage = parseFloat(String(p['Footage UG'] || '0').replace(/,/g, '')) || 0;
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

          // Format Locate Info if available
          let locateDetails = "No locate data found.";
          if (project['LocateInfo']) {
              const l = project['LocateInfo'];
              locateDetails = `Tickets: ${[l['Locate ticket'], l['2nd ticket'], l['3rd ticket'], l['4th ticket']].filter(Boolean).join(', ')} | Phone: ${l['Locate Number']} | Status: ${l['TICKET STATUS']} | Due: ${l['DUE DATE']} | Expires: ${l['EXPIRE DATE']}`;
          }

          projectDataContext += `\n- **${project['NTP Number']}** | Supervisor: ${project['Assigned Supervisor']} | Status: ${project['Constuction Status']} | Health: ${projectStatus} | Area: ${project['AREA']} | Footage: ${project['Footage UG']} | Complete: ${project['UG Percentage Complete']} | Deadline (TSD): ${sowTsdDate} | Est Cost: ${sowCost} | Door Tag: ${doorTagDate} | Vendor: ${vendorAssignment} | HHP (SAs): ${hhp} | Assigned: ${dateAssigned} | Completion: ${completionDate} | Locates: { ${locateDetails} }`;
        });
      } else {
        projectDataContext = `\n\n⚠️ SYSTEM ALERT: LIVE PROJECT DATA IS CURRENTLY OFFLINE/UNAVAILABLE. \nYou DO NOT have access to any project statuses, supervisors, or footage. \nIf the user asks about a specific project, you MUST state that live data is currently unavailable and refer them to the supervisor.`;
      }

      const knowledgeBase = `
TILLMAN FIBER & LIGHTSPEED CONSTRUCTION - MASTER KNOWLEDGE BASE

${projectDataContext}

## SECTION 6: RATE CARDS (DETAILED)

### TILLMAN FIBER STANDARD RATE CARD (Construction v1.1) - INTERNAL/CONSTRUCTION USE
*   **Aerial**:
    *   TCA1 Place Aerial - Strand 6M to 6.6M: $1.10/FT
    *   TCA1A Anchor/Rod Mechanical: $75.00/EA
    *   TCA1B Anchor/Rod Hand-Dig: $75.00/EA
    *   TCA2 Place Aerial - Stand 10M to 25M: $1.30/FT
    *   TCA3 Place Aerial - Self-support fiber: $1.36/FT
    *   TCA4 Place Aerial - Self-support flexible duct: $1.55/FT
    *   TCA5 Total Bundle < 2500': $2.00/FT
    *   TCA6 Total Bundle > 5000': $1.90/FT
    *   TCA7 Total Bundle < 5000': $1.80/FT
*   **Buried (Directional Bore)**:
    *   TCBDB2 (Standard, up to 4.0"): $10.00/FT
    *   TCBDB4 (Standard, over 4.0" to 7.0"): $14.00/FT
    *   TCBDB8 (Rock, up to 4.0"): $25.00/FT
    *   TCBDB9 (Rock, over 4.0" to 7.0"): $29.00/FT
*   **Buried (Hand Dig)**:
    *   TCBHD1 (6" cover): $4.50/FT
    *   TCBHD2 (7"-12" cover): $5.50/FT
    *   TCBHD3 (12"-18" cover): $6.50/FT
    *   TCBHD4 (19"-24" cover): $7.50/FT
    *   TCBHD5 (25"-36" cover): $8.50/FT
    *   TCBHD6 (37"-48" cover): $11.00/FT
    *   TCBHD7 (Add'l depth 6"): $1.25/FT
*   **Buried (Missile/Stitch)**:
    *   TCBMB1 (up to 4.0"): $9.00/FT
    *   TCBMB2 (over 4.0" to 7.0"): $12.50/FT
*   **Buried (Mechanical/Plow)**:
    *   TCBP1 (6" cover): $4.25/FT
    *   TCBP2 (7"-12"): $4.40/FT
    *   TCBP3 (12"-18"): $4.55/FT
    *   TCBP4 (19"-24"): $5.00/FT
    *   TCBP5 (25"-36"): $5.35/FT
    *   TCBP6 (37"-48"): $6.50/FT
    *   TCBP7 (Add'l depth): $1.50/FT
*   **BSW (Buried Service Wire)**:
    *   TCBSW3 (Buried drop & duct pull): $1.50/FT
    *   TCBSW4 (Duct pull method): $0.85/FT
    *   TCBSW4B (Duct blowing method): $1.20/FT
    *   TCBSW5 (Buried drop/microduct): $1.30/FT
    *   TCBSW13 (Driveway bore): $15.00/FT
    *   TCBSW17 (Trip charge single): $55.00/EA
    *   TCBSW18 (Trip charge crew): $245.00/EA
*   **Electronics/OLT**:
    *   TCE1 OLT Cabinet Place/Test: $750.00/LOC
    *   TCE2 OLT Clam Shell: $620.00/LOC
    *   TCE3 OLT Strand: $390.00/LOC
*   **Restoration Hourly**:
    *   TCHR1 CDL Driver Differential: $60.00/HR
    *   TCHR2 CDL Driver Normal: $50.00/HR
    *   TCHR6 Electrician Differential: $120.00/HR
    *   TCHR7 Electrician Normal: $90.00/HR
    *   TCHR11 Flagger Differential: $35.00/HR
    *   TCHR12 Flagger Normal: $40.00/HR
    *   TCHR16 General Laborer Differential: $50.00/HR
    *   TCHR17 General Laborer Normal: $40.00/HR
    *   TCHR26 Lineman Differential: $75.00/HR
    *   TCHR27 Lineman Normal: $70.00/HR
    *   TCHR31 Machine Operator Differential: $70.00/HR
    *   TCHR32 Machine Operator Normal: $60.00/HR
    *   TCHR46 Splicer Differential: $90.00/HR
    *   TCHR47 Splicer Normal: $80.00/HR
    *   TCHR51 Supervisor Differential: $100.00/HR
    *   TCHR52 Supervisor Normal: $85.00/HR
*   **Splicing (Turnkey)**:
    *   TCSS1 Cable Only <=96 fibers: $29.80/EA
    *   TCSS2 Ribbon <=96 fibers: $12.75/EA
    *   TCSS3 Cable Only >96 fibers: $25.00/EA
    *   TCSS4 Ribbon >96 fibers: $12.00/EA
    *   TCSS11 Terminal Closure <= 12 Fibers: $194.00/EA
*   **Support Structure (Handholes/Pads)**:
    *   TCMB1 Drop wire terminal: $50.00/EA
    *   TCMB8 Ground rod: $50.00/EA
    *   TCMB10 Ground wire: $2.00/FT
    *   TCMB30 Pad up to 10 sq ft: $1,500.00/EA
    *   TCMB3A HH 13x24x18: $122.00/EA
    *   TCMB3B HH 17x30x24: $243.00/EA
    *   TCMB4 HH 30x48x36: $440.00/EA
    *   TCMU1 FDH/OLT Vault Mtd: $375.00/EA
    *   TCMU2 FDH/OLT Pole Mtd: $450.00/EA

### FLORIDA REGION SUBCONTRACTOR RATE CARD (Tillman Fiber 2024 - REVISED 1/31/2025) - EXTERNAL/SUB USE
*   **Aerial**:
    *   TCA1 Place Aerial - Strand 6M to 6.6M: $0.55/FT
    *   TCA1A Anchor/Rod Mechanical: $30.00/EA
    *   TCA1B Anchor/Rod Hand-Dig: $30.00/EA
    *   TCA2 Place Aerial - Stand 10M to 25M: $0.70/FT
    *   TCA3 Place Aerial - Self-support fiber: $0.80/FT
    *   TCA4 Place Aerial - Self-support flexible duct: $0.90/FT
    *   TCA5 Total Bundle < 2500': $0.70/FT
    *   TCA6 Total Bundle > 5000': $0.65/FT
    *   TCA7 Total Bundle < 5000': $0.60/FT
*   **Buried (Directional Bore)**:
    *   TCBDB2 (Standard, up to 4.0"): $7.00/FT
    *   TCBDB4 (Standard, over 4.0" to 7.0"): $9.00/FT
    *   TCBDB8 (Rock, up to 4.0"): $15.00/FT
    *   TCBDB9 (Rock, over 4.0" to 7.0"): $17.00/FT
*   **Buried (Hand Dig)**:
    *   TCBHD1 (6" cover): $2.70/FT
    *   TCBHD2 (7"-12" cover): $3.30/FT
    *   TCBHD3 (12"-18" cover): $3.90/FT
    *   TCBHD4 (19"-24" cover): $4.00/FT
    *   TCBHD5 (25"-36" cover): $4.25/FT
    *   TCBHD6 (37"-48" cover): $4.50/FT
    *   TCBHD7 (Add'l depth 6"): $0.50/FT
*   **Buried (Missile)**:
    *   TCBMB1 (up to 4.0"): $5.50/FT
    *   TCBMB2 (over 4.0" to 7.0"): $7.50/FT
*   **Buried (Mechanical)**:
    *   TCBP1 (6" cover): $1.50/FT
    *   TCBP2 (7"-12"): $1.65/FT
    *   TCBP3 (12"-18"): $1.75/FT
    *   TCBP4 (19"-24"): $1.85/FT
    *   TCBP5 (25"-36"): $1.95/FT
    *   TCBP6 (37"-48"): $2.50/FT
*   **BSW (Buried Service Wire)**:
    *   TCBSW3 (Buried drop & duct pull): $0.80/FT
    *   TCBSW4 (Duct pull method): $0.50/FT
    *   TCBSW4B (Duct blowing method): $0.70/FT
    *   TCBSW5 (Buried drop/microduct): $0.75/FT
    *   TCBSW13 (Driveway bore): $8.00/FT
    *   TCBSW17 (Trip charge single): $33.00/EA
    *   TCBSW18 (Trip charge crew): $147.00/EA
*   **Electronics**:
    *   TCE1 OLT Cabinet: $450.00/LOC
    *   TCE2 OLT Clam Shell: $372.00/LOC
    *   TCE3 OLT Strand: $234.00/LOC
*   **Restoration Hourly**:
    *   TCHR1 CDL Driver Differential: $36.00/HR
    *   TCHR2 CDL Driver Normal: $30.00/HR
    *   TCHR6 Electrician Differential: $72.00/HR
    *   TCHR7 Electrician Normal: $54.00/HR
    *   TCHR11 Flagger Differential: $21.00/HR
    *   TCHR12 Flagger Normal: $24.00/HR
    *   TCHR16 General Laborer Differential: $30.00/HR
    *   TCHR17 General Laborer Normal: $24.00/HR
    *   TCHR26 Lineman Differential: $45.00/HR
    *   TCHR27 Lineman Normal: $42.00/HR
    *   TCHR31 Machine Operator Differential: $42.00/HR
    *   TCHR32 Machine Operator Normal: $36.00/HR
    *   TCHR46 Splicer Differential: $54.00/HR
    *   TCHR47 Splicer Normal: $48.00/HR
    *   TCHR51 Supervisor Differential: $60.00/HR
    *   TCHR52 Supervisor Normal: $51.00/HR
*   **Splicing**:
    *   TCSS1 Cable Only <=96 fibers: $17.00/EA
    *   TCSS2 Ribbon <=96 fibers: $6.50/EA
    *   TCSS3 Cable Only >96 fibers: $15.00/EA
    *   TCSS4 Ribbon >96 fibers: $6.00/EA
    *   TCSS11 Terminal Closure <= 12 Fibers: $115.00/EA
*   **Support Structure (Handholes/Pads)**:
    *   TCMB1 Drop wire terminal: $28.00/EA
    *   TCMB8 Ground rod: $25.00/EA
    *   TCMB10 Ground wire: $1.00/FT
    *   TCMB30 Pad up to 10 sq ft: $850.00/EA
    *   TCMB3A HH 13x24x18: $70.00/EA
    *   TCMB3B HH 17x30x24: $140.00/EA
    *   TCMB4 HH 30x48x36: $250.00/EA
    *   TCMU1 FDH/OLT Vault Mtd: $215.00/EA
    *   TCMU2 FDH/OLT Pole Mtd: $250.00/EA
    *   TMDU-014 Core Bore >2.5 to 4.0": $75.00/EA
    *   TMDULU-001-A MDU Turnkey 1-15 Units: $190.00/LU

**KEY DIFFERENCE INSTRUCTION:** When answering questions about rates, ALWAYS specify which rate card you are referencing (Standard/Internal vs. Subcontractor/External). If the user asks generally, provide the STANDARD rate first, then mention the SUBCONTRACTOR rate as a comparison.

## SECTION 7: UTILITY LOCATE TICKET REQUESTS (NEW)
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

## SECTION 8: INSPECTOR TRAINING & DAILY CHECKLIST
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

## SECTION 9: TIMESTAMP CAMERA SETUP
*   **Requirement**: Customize photo names based on project and sheet number.
*   **Steps**:
    1.  Click clock icon (bottom right).
    2.  Click "Advanced".
    3.  Click "File name format".
    4.  Choose option starting with \`custom-input-text_\`.
    5.  Return to main screen, click clock icon again.
    6.  Click "Display custom text on camera".
    7.  Input format: \`ProjectName-Sheet#\` (e.g., \`D-HDH60-Sheet5\`).
*   **Note**: Update this number when moving to a new sheet. All photos will autosave as \`ProjectName-Sheet#_DateTime.jpg\`.

## SECTION 10: IMPORTANT LINKS
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

## SECTION 11: MANDATORY LINKING RULES
*   **Contractor Invoicing**: ALWAYS provide this link: [Penguin Data](https://fullcircle.penguindata.com/login)
*   **Maps / Asbuilts / End of Shifts (EOS)**: ALWAYS provide this link: [Share Drive](https://lightspeedconstructiongroup.sharepoint.com/sites/SoutheastRegion-TillmanFiberProject/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FSoutheastRegion%2DTillmanFiberProject%2FShared%20Documents%2FTillman%20Fiber%20Project)
*   **Project Specifics**: When answering about specific project details (status, cost, etc.), ALWAYS include this link: [Project Summary Data](https://lightspeedconstructiongroup.sharepoint.com/:x:/s/SoutheastRegion-TillmanFiberProject/ETFA0lynl1BPjXCjpf5ujnIB8_SxhhTuIUXyBj_mezjgoA?e=LTUMSD&web=1)
*   **Locates / Digging**: When answering about locates, ALWAYS include this link: [Sunshine 811](https://exactix.sunshine811.com/login)
`;

      const systemInstruction = `You are a knowledgeable AI assistant for Tillman Fiber and Lightspeed Construction Group.

CRITICAL DATA AVAILABILITY STATUS:
${projectData && projectData.length > 0 ? "ONLINE - Project Data Available" : "OFFLINE - NO PROJECT DATA"}

CRITICAL INSTRUCTIONS:
1.  **IF PROJECT DATA IS OFFLINE**: You MUST NOT answer questions about specific project numbers, status, or supervisors. You MUST reply with: "I'm sorry, but the live project database is currently unavailable. Please ask the assigned supervisor for details."
2.  **IF PROJECT DATA IS ONLINE**: Use the "LIVE PROJECT DATA" section to answer. The "NTP Number" (Column A) is the project identifier.
3.  **Procedures**: Always use the knowledge base for procedure questions (BOM, NTP, Safety, etc.) regardless of data status.
4.  **No Hallucinations**: NEVER invent project details. If a project isn't in the list, say so.
5.  **Roles**: Mention responsible roles (Project Coordinator, PM, etc.).
6.  **Specifics**: Cite exact timelines (e.g., 7 days restoration) and specs (e.g., 24" depth).
7.  **Rate Cards**: Distinguish between the "Standard Rate Card" (Internal) and "Subcontractor Rate Card" (External). If a user asks for a rate, check both and clarify the difference.
8.  **New Data Fields**: 
    *   **HHP**: Refers to "Serviceable Addresses" or "Households Passed".
    *   **SOW Estimated Cost**: The estimated cost for the project.
    *   **On Track or In Jeopardy**: The health status of the project.
9.  **Tone**: Professional but friendly.
10. **Identity**: You are **Nexus**, the LSCG Tillman AI Assistant. **Do not start every response by stating your name. Only state it if asked.**
11. **LINKING RULES**: You **MUST** use Markdown format [Title](URL) for all links. Follow the mandatory linking rules in Section 11 of the Knowledge Base.
12. **Locate Tables**: When answering questions about locate tickets, format the response as a Markdown table.

KNOWLEDGE BASE & LIVE PROJECT DATA:
${knowledgeBase}`;

      // Call Google GenAI API
      const response = await aiRef.current.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: messageText,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const text = response.text;
      const assistantMessage = {
        role: 'assistant',
        content: text
      };

      setMessages([...updatedMessages, assistantMessage]);
      
      if (autoSpeak) {
        if (text) speakText(text);
      }
    } catch (error: any) {
      console.error('Error getting response:', error);
      const errorMessage = {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message || error}. Please check the console for details.`
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
    "What is the status of a specific project?",
    "What are the bore log requirements?",
    "What's the 7-day restoration policy?",
    "How do I submit a closeout package?",
    "What is the rate for directional boring?"
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#383e4b] to-[#000000] to-50% sm:to-100% bg-cover">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#383e4b] to-[#000000] text-white p-4 shadow-lg header-buttons flex-none sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
             {/* Logo */}
             <div className="h-10 w-auto flex items-center justify-center">
                <img src="./LSCG_Logo_White_transparentbackground.png" alt="LSCG Logo" className="h-10 w-auto object-contain" />
             </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Nexus - LSCG Tillman Assistant</h1>
              <p className="text-gray-300 text-xs hidden sm:block">AI-powered Construction & Project Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDashboard(!showDashboard)} className={`p-2 rounded-full transition-all ${showDashboard ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`} title={showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
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
                <p className="text-xs text-gray-500 mt-1">Changes are saved automatically.</p>
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
          If you are running on GitHub Pages, you must manually set your API key in the index.html file (line 30).
        </div>
      )}

      {/* Data Load Error Banner - Visible if Excel fails to load */}
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

      {/* Dashboard Toggle View */}
      {showDashboard && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-6 no-print flex-none">
          <ExternalDashboard />
        </div>
      )}

      {/* Quick Questions */}
      {messages.length === 1 && !showDashboard && (
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
                   {message.role === 'assistant' ? renderMessageContent(message.content) : message.content}
                </div>
                {message.role === 'assistant' && idx === messages.length - 1 && !isLoading && (
                  <button onClick={() => speakText(message.content)} className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 no-print font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    Read aloud
                  </button>
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
            <button onClick={toggleListening} disabled={isLoading} className={`p-4 rounded-xl transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'} text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-none`} title={isListening ? 'Stop listening' : 'Click to speak'}>
              {isListening ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
            <div className="flex-1 relative">
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyPress} placeholder={isListening ? "Listening..." : "Type your question or click the microphone to speak..."} disabled={isLoading || isListening} className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm" rows={1} style={{minHeight: '48px', maxHeight: '120px'}} />
            </div>
            <button onClick={() => sendMessage()} disabled={!inputText.trim() || isLoading} className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-none" title="Send message">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
          {isListening && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-2 animate-pulse justify-center sm:justify-start">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              Listening... Speak your question now
            </p>
          )}
          {isSpeaking && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-blue-600 flex items-center gap-2">
                <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                Speaking response...
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
          <span>💡 Ask about procedures, timelines, rates, or live project data</span>
          <span className="hidden sm:inline">•</span>
          <span>🎤 Voice works in Chrome & Edge</span>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<TillmanKnowledgeAssistant />);