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
    <div className="bg-white p-1 rounded-xl shadow-md border border-blue-100 mb-4 h-[600px] w-full animate-fade-in overflow-hidden">
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
      content: "Hello! I'm your Tillman/Lightspeed Knowledge Assistant. I can answer questions about project procedures, rate cards, closeout requirements, and more. I also have access to live project data. You can type your question or click the microphone to speak. How can I help you today?"
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
      if (voices.length > 0) {
        console.log('Available voices:', voices.map(v => v.name));
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
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
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

      const excelUrl = 'https://jckraus1.github.io/Tillman-Dashboard/tillman-project.xlsx';
      console.log(`Fetching Excel file from: ${excelUrl}`);
      
      const response = await fetch(excelUrl, {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ Excel downloaded:', (arrayBuffer.byteLength / 1024).toFixed(2), 'KB');
      
      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      
      const targetSheets = [
        "Tillman UG Footage",
        "Completed Projects Pending PW",
        "Projects Pending Tillman QC ",
        "Comp Projects Invoiced-Paid Out"
      ];
      
      let allData: any[] = [];
      let sheetStats: Record<string, number> = {};
      
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
            if (!market) {
               market = "General";
            }

            return {
              ...row,
              'NTP Number': ntpValue,
              'Market': market
            };
          }).filter(row => {
            const ntpNumber = row['NTP Number'];
            
            if (!ntpNumber || String(ntpNumber).trim() === '') {
              return false;
            }

            if (typeof ntpNumber === 'string') {
              const lowerNtp = ntpNumber.toLowerCase().trim();
              const isExcluded = excludedPhrases.some(phrase => lowerNtp.includes(phrase.toLowerCase()));
              if (isExcluded) return false;
            }

            const hasData = Object.values(row).some(value => value && String(value).trim() !== '');
            if (!hasData) return false;

            return true;
          });
          
          sheetStats[sheetName] = validRows.length;
          
          if (validRows.length > 0) {
            const taggedData = validRows.map(row => ({
              ...row,
              '__source_sheet': sheetName
            }));
            allData = allData.concat(taggedData);
          }
        }
      });
      
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
      setDataLoadError(`Failed to load Excel data: ${error.message}. Ensure "tillman-project.xlsx" exists in the GitHub repo.`);
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
    return text
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      .replace(/^[\s]*[☐✅✓]\s+/gm, '')
      .replace(/^[\s]*[-=]{3,}[\s]*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[═│┌┐└┘├┤┬┴┼]/g, '')
      .trim();
  };

  const speakText = (text: string) => {
    if (!autoSpeak) return;
    synthRef.current.cancel();
    const cleanedText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0; 
    utterance.volume = 1.0;
    
    const voices = synthRef.current.getVoices();
    
    // Prioritize Moira, then Victoria, then other female voices
    const moiraVoice = voices.find(voice => voice.name.includes('Moira'));
    const victoriaVoice = voices.find(voice => voice.name.includes('Victoria'));
    const samanthaVoice = voices.find(voice => voice.name.includes('Samantha'));
    const femaleVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('Karen') || 
      voice.name.includes('Fiona') ||
      (voice.name.includes('Google') && voice.name.includes('US') && voice.lang === 'en-US')
    );
    
    if (moiraVoice) {
        utterance.voice = moiraVoice;
    } else if (victoriaVoice) {
        utterance.voice = victoriaVoice;
    } else if (samanthaVoice) {
      utterance.voice = samanthaVoice;
    } else if (femaleVoice) {
      utterance.voice = femaleVoice;
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
      
      // CRITICAL CHECK: Only build context if data is loaded
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
        
        // Removed limit: Including ALL projects to give AI full context
        projectData.forEach(project => {
          // Explicitly mapping Project Completion Date
          const completionDate = project['Project Completion Date'] || project['Completion Date'] || 'N/A';
          projectDataContext += `\n- **${project['NTP Number']}** | Supervisor: ${project['Assigned Supervisor']} | Status: ${project['Constuction Status']} | Area: ${project['AREA']} | Footage: ${project['Footage UG']} | Complete: ${project['UG Percentage Complete']} | Deadline: ${project['SOW TSD Date']} | Completion Date: ${completionDate}`;
        });
      } else {
        projectDataContext = `\n\n⚠️ SYSTEM ALERT: LIVE PROJECT DATA IS CURRENTLY OFFLINE/UNAVAILABLE. \nYou DO NOT have access to any project statuses, supervisors, or footage. \nIf the user asks about a specific project, you MUST state that live data is currently unavailable and refer them to the supervisor.`;
      }

      // Consolidating knowledge from the provided documents
      const knowledgeBase = `
TILLMAN FIBER & LIGHTSPEED CONSTRUCTION - MASTER KNOWLEDGE BASE

${projectDataContext}

## SECTION 6: RATE CARDS (IMPORTANT: DIFFERENTIATE BETWEEN STANDARD AND SUBCONTRACTOR RATES)

### TILLMAN FIBER STANDARD RATE CARD (Construction v1.1) - INTERNAL/CONSTRUCTION USE
This card lists rates for Aerial, Buried, and Underground OSP Construction. Key items:
*   **Aerial**:
    *   TCA1 Place Aerial - Strand 6M to 6.6M: $1.10/FT
    *   TCA3 Place Aerial - Self-support fiber: $1.36/FT
    *   TCA4 Place Aerial - Self-support flexible duct: $1.55/FT
*   **Buried (Directional Bore)**:
    *   TCBDB2 (Standard, up to 4.0"): $10.00/FT
    *   TCBDB4 (Standard, over 4.0" to 7.0"): $14.00/FT
    *   TCBDB8 (Rock, up to 4.0"): $25.00/FT
*   **Buried (Hand Dig)**:
    *   TCBHD1 (6" cover): $4.50/FT
    *   TCBHD2 (7"-12" cover): $5.50/FT
    *   TCBHD6 (37"-48" cover): $11.00/FT
*   **Buried (Missile/Stitch)**:
    *   TCBMB1 (up to 4.0"): $9.00/FT
    *   TCBMB2 (over 4.0" to 7.0"): $12.50/FT
*   **Buried Support**:
    *   TCMB1 Drop wire terminal: $50.00/EA
    *   TCMB8 Ground rod: $50.00/EA
    *   TCMB10 Ground wire: $2.00/FT
*   **Restoration Hourly**:
    *   TCHR2 CDL Truck Driver Normal: $50.00/HR
    *   TCHR17 General Laborer Normal: $40.00/HR
    *   TCHR27 Lineman Normal: $70.00/HR
*   **Splicing**:
    *   TCSS1 Cable Only <=96 fibers: $29.80/EA
    *   TCSS3 Cable Only >96 fibers: $25.00/EA
    *   TCSS11 Terminal Closure <= 12 Fibers: $194.00/EA

### FLORIDA REGION SUBCONTRACTOR RATE CARD (Tillman Fiber 2024 - REVISED 1/31/2025) - EXTERNAL/SUB USE
This card lists rates paid to Subcontractors. **Note the differences in pricing compared to the Standard Card.**
*   **Aerial**:
    *   TCA1 Place Aerial - Strand 6M to 6.6M: $0.55/FT
    *   TCA3 Place Aerial - Self-support fiber: $0.80/FT
    *   TCA4 Place Aerial - Self-support flexible duct: $0.90/FT
*   **Buried (Directional Bore)**:
    *   TCBDB2 (Standard, up to 4.0"): $7.00/FT
    *   TCBDB4 (Standard, over 4.0" to 7.0"): $9.00/FT
    *   TCBDB8 (Rock, up to 4.0"): $15.00/FT
*   **Buried (Hand Dig)**:
    *   TCBHD1 (6" cover): $2.70/FT
    *   TCBHD2 (7"-12" cover): $3.30/FT
    *   TCBHD6 (37"-48" cover): $4.50/FT
*   **Buried (Missile)**:
    *   TCBMB1 (up to 4.0"): $5.50/FT
    *   TCBMB2 (over 4.0" to 7.0"): $7.50/FT
*   **Buried Support**:
    *   TCMB1 Drop wire terminal: $28.00/EA
    *   TCMB8 Ground rod: $25.00/EA
    *   TCMB10 Ground wire: $1.00/FT
*   **Restoration Hourly**:
    *   TCHR2 CDL Truck Driver Normal: $30.00/HR
    *   TCHR17 General Laborer Normal: $24.00/HR
    *   TCHR27 Lineman Normal: $42.00/HR
*   **Splicing**:
    *   TCSS1 Cable Only <=96 fibers: $17.00/EA
    *   TCSS3 Cable Only >96 fibers: $15.00/EA
    *   TCSS11 Terminal Closure <= 12 Fibers: $115.00/EA

**KEY DIFFERENCE INSTRUCTION:** When answering questions about rates, ALWAYS specify which rate card you are referencing (Standard/Internal vs. Subcontractor/External). If the user asks generally, provide the STANDARD rate first, then mention the SUBCONTRACTOR rate as a comparison.

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
8.  **Tone**: Professional but friendly.

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold">Tillman Knowledge Assistant</h1>
              <p className="text-blue-100 text-sm">Voice-enabled AI for construction procedures & standards</p>
              {isLoadingData && (
                <p className="text-blue-200 text-xs mt-1 flex items-center gap-2">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading live project data...
                </p>
              )}
              {!isLoadingData && projectData && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-blue-200 text-xs">
                    ✅ Live data: {projectData.length} projects | Updated: {lastDataUpdate}
                  </p>
                  <button onClick={loadSheetJSAndFetchData} className="text-blue-200 hover:text-white transition-colors" title="Refresh project data">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDashboard(!showDashboard)} className={`p-3 rounded-full transition-all ${showDashboard ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20 text-white'}`} title={showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </button>
            <button onClick={() => setAutoSpeak(!autoSpeak)} className={`p-3 rounded-full transition-all ${autoSpeak ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`} title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}>
              {autoSpeak ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* API Key Error Banner */}
      {apiKeyError && (
        <div className="bg-red-600 text-white px-6 py-4 text-center font-bold shadow-md">
          ⚠️ MISSING API KEY: The application cannot connect to Gemini. <br/>
          If you are running on GitHub Pages, you must manually set your API key in the index.html file (line 30).
        </div>
      )}

      {/* Data Load Error Banner - Visible if Excel fails to load */}
      {dataLoadError && (
        <div className="bg-red-100 border-b border-red-200 text-red-700 px-6 py-3 text-sm flex items-center justify-between">
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
        <div className="max-w-4xl mx-auto w-full px-4 pt-6">
          <ExternalDashboard />
        </div>
      )}

      {/* Quick Questions */}
      {messages.length === 1 && !showDashboard && (
        <div className="max-w-4xl mx-auto w-full px-4 py-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">Quick questions to get started:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickQuestions.map((question, idx) => (
              <button key={idx} onClick={() => sendMessage(question)} className="text-left p-3 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-blue-50 transition-all border border-gray-200 text-sm">
                <svg className="w-4 h-4 inline mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, idx) => (
            <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                {message.role === 'assistant' && idx === messages.length - 1 && !isLoading && (
                  <button onClick={() => speakText(message.content)} className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    Read aloud
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-200">
                <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end">
            <button onClick={toggleListening} disabled={isLoading} className={`p-4 rounded-xl transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'} text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`} title={isListening ? 'Stop listening' : 'Click to speak'}>
              {isListening ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
            <div className="flex-1 relative">
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyPress} placeholder={isListening ? "Listening..." : "Type your question or click the microphone to speak..."} disabled={isLoading || isListening} className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed" rows={2} />
            </div>
            <button onClick={() => sendMessage()} disabled={!inputText.trim() || isLoading} className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Send message">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
          {isListening && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
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

      {/* Usage Tips */}
      <div className="bg-blue-50 border-t border-blue-100 px-4 py-2">
        <div className="max-w-4xl mx-auto text-xs text-blue-700 flex items-center justify-center gap-4 flex-wrap">
          <span>💡 Ask about procedures, timelines, requirements, or standards</span>
          <span>•</span>
          <span>🎤 Voice works in Chrome & Edge</span>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<TillmanKnowledgeAssistant />);