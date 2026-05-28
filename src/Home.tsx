import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { LEADS_WEBHOOK_URL } from "./config";

type StepId =
  | "age"
  | "beneficiary"
  | "zip"
  | "name"
  | "beneficiary-name"
  | "email"
  | "phone"
  | "loading"
  | "congrats"
  | "over80_redirect";

interface StepConfig {
  id: StepId;
  title: string;
  subtitle?: string;
  next?: StepId;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<StepId>("age");
  const [stepHistory, setStepHistory] = useState<StepId[]>([]);
  
  // Form values
  const [age, setAge] = useState<string>("");
  const [beneficiary, setBeneficiary] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [beneficiaryName, setBeneficiaryName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // Validation errors
  const [error, setError] = useState<string>("");

  // Dynamic social proof visitor counter
  const [visitorCount, setVisitorCount] = useState<number>(2847);

  // Loading screen simulation states
  const [loadingStep, setLoadingStep] = useState<number>(0);

  // UTM params captured from the page URL on first load
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});

  // Capture utm_* + referrer once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => {
      const val = params.get(key);
      if (val) utms[key] = val;
    });
    if (document.referrer) utms.referrer = document.referrer;
    setUtmParams(utms);
  }, []);

  // Submit the lead to Google Sheets via Apps Script webhook.
  // Uses text/plain so the browser does NOT send a CORS preflight
  // (Apps Script web apps don't handle OPTIONS requests). The Apps
  // Script parses the body as JSON server-side.
  const submitLead = async () => {
    if (!LEADS_WEBHOOK_URL || LEADS_WEBHOOK_URL.startsWith("PASTE_")) {
      console.warn("LEADS_WEBHOOK_URL not configured — skipping submission");
      return;
    }
    try {
      await fetch(LEADS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          age,
          beneficiary,
          zip,
          firstName,
          lastName,
          beneficiaryName,
          email,
          phone,
          ...utmParams,
        }),
      });
    } catch (err) {
      console.error("Lead submission failed:", err);
    }
  };

  useEffect(() => {
    // Slowly increment visitor count to simulate live traffic
    const interval = setInterval(() => {
      setVisitorCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle loading screen step progression
  useEffect(() => {
    if (currentStep === "loading") {
      // Fire the lead submission in parallel with the loading animation.
      // We don't await it — the funnel proceeds to "congrats" regardless
      // of whether the POST succeeds, so a network blip doesn't block the user.
      submitLead();

      setLoadingStep(0);
      const timer1 = setTimeout(() => setLoadingStep(1), 1000);
      const timer2 = setTimeout(() => setLoadingStep(2), 2000);
      const timer3 = setTimeout(() => setLoadingStep(3), 3000);
      const timer4 = setTimeout(() => {
        setLoadingStep(4);
        goToStep("congrats");
      }, 4000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [currentStep]);

  const goToStep = (step: StepId) => {
    setError("");
    setStepHistory((prev) => [...prev, currentStep]);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setError("");
    if (stepHistory.length > 0) {
      const prev = stepHistory[stepHistory.length - 1];
      setStepHistory((prevHistory) => prevHistory.slice(0, -1));
      setCurrentStep(prev);
    }
  };

  const handleAgeSelect = (val: string) => {
    setAge(val);
    if (val === "Over 80") {
      goToStep("over80_redirect");
    } else {
      goToStep("beneficiary");
    }
  };

  const handleBeneficiarySelect = (val: string) => {
    setBeneficiary(val);
    goToStep("zip");
  };

  const validateStep = (step: StepId): boolean => {
    if (step === "zip") {
      if (!zip) {
        setError("Please specify an answer");
        return false;
      }
      if (!/^\d{5}$/.test(zip)) {
        setError("Please enter a valid 5-digit ZIP code");
        return false;
      }
    }
    if (step === "name") {
      if (!firstName || !lastName) {
        setError("Please specify an answer");
        return false;
      }
    }
    if (step === "beneficiary-name") {
      if (!beneficiaryName) {
        setError("Please specify an answer");
        return false;
      }
    }
    if (step === "email") {
      if (!email) {
        setError("Please specify an answer");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address");
        return false;
      }
    }
    if (step === "phone") {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!phone) {
        setError("Please specify an answer");
        return false;
      }
      if (cleanPhone.length < 10) {
        setError("Please enter a valid 10-digit phone number");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === "zip") goToStep("name");
    else if (currentStep === "name") goToStep("beneficiary-name");
    else if (currentStep === "beneficiary-name") goToStep("email");
    else if (currentStep === "email") goToStep("phone");
    else if (currentStep === "phone") goToStep("loading");
  };

  const getProgressPercentage = () => {
    switch (currentStep) {
      case "age":
        return 0;
      case "beneficiary":
        return 14;
      case "zip":
        return 28;
      case "name":
        return 42;
      case "beneficiary-name":
        return 57;
      case "email":
        return 71;
      case "phone":
        return 85;
      case "loading":
      case "congrats":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6FBFF] text-[#2D3F63] font-sans antialiased selection:bg-[#BF323A]/10 selection:text-[#BF323A]">
      {/* HEADER */}
      <header className="w-full bg-[#F6FBFF] border-b border-[#EAEAEB]/50 py-4 px-4 flex items-center justify-center relative h-[72px]">
        {currentStep !== "age" &&
          currentStep !== "loading" &&
          currentStep !== "congrats" &&
          currentStep !== "over80_redirect" && (
            <button
              onClick={goBack}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#2D3F63] hover:text-[#BF323A] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          )}
        <img
          src="https://assets.prd.heyflow.com/flows/4qRxN39uJuUO6A5FjNxz/www/assets/3ab2ed2a-646a-4a1a-b51c-6e282b9626c0.svg"
          alt="American Benefits"
          className="h-8 md:h-10 object-contain"
        />
      </header>

      {/* MAIN WRAPPER */}
      <main className="flex-1 flex flex-col items-center px-4 w-full max-w-4xl mx-auto">
        
        {/* PROGRESS BAR - ONLY FOR STEPS 2-7 */}
        {currentStep !== "age" &&
          currentStep !== "loading" &&
          currentStep !== "congrats" &&
          currentStep !== "over80_redirect" && (
            <div className="w-full max-w-[400px] pt-[30px] pb-[20px]">
              <div className="w-full h-[7px] bg-[#EAEAEB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#30AB66] transition-all duration-500 ease-out"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>
          )}

        {/* SCREEN RENDERER */}
        <div className="w-full">
          
          {/* STEP 1: AGE */}
          {currentStep === "age" && (
            <div className="space-y-8 animate-fadeIn pt-6 pb-12">
              <div className="text-center space-y-4">
                <h1 
                  className="text-[32px] md:text-[40px] font-bold text-[#2D3F63] leading-[1.2] tracking-tight max-w-xl mx-auto"
                  style={{ fontFamily: "'Alata', sans-serif" }}
                >
                  Your Homeowner&apos;s Insurance Protects the Bank.{" "}
                  <span className="text-[#BF323A] italic block mt-1">This Protects Your Family.</span>
                </h1>
                <p className="text-sm md:text-base text-[#505051] max-w-2xl mx-auto leading-relaxed font-sans">
                  If you got sick, hurt, or passed away tomorrow - <strong>could your family afford to keep the house?</strong> Check your eligibility for coverage that makes sure the answer is <strong>yes.</strong> Takes just 60 seconds. No cost.
                </p>
              </div>

              {/* CARD CONTAINER ONLY ON FIRST STEP */}
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEB] shadow-sm max-w-lg mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <h2 
                    className="text-2xl font-bold text-[#2D3F63]"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                  >
                    What Is Your Current Age?
                  </h2>
                  <p className="text-xs text-[#505051] font-sans">
                    Depending on your age you could qualify for even higher coverage and benefits.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {["Under 60", "60 to 69", "70 to 79", "Over 80"].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleAgeSelect(val)}
                      className="w-full py-4 px-6 rounded-[15px] bg-[#BF323A] hover:bg-[#ca545a] active:scale-[0.98] text-white font-bold text-base shadow-sm transition-all text-center cursor-pointer"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      <span className="text-white font-bold">{val}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TRUST BADGES */}
              <div className="pt-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                  {/* Badge 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 text-[#2D3F63] shrink-0">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <title>family-child</title>
                        <circle cx="12" cy="10.25" r="2.25" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M10.312,21.5,10.5,23h3l.75-6h1.5V14.75a3.75,3.75,0,0,0-6-3" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <circle cx="4" cy="8.249" r="2.75" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></circle>
                        <path d="M7.189,14.055A3.5,3.5,0,0,0,.5,15.5v3H2l.5,5h3l.5-5H7" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                        <circle cx="20" cy="8.249" r="2.75" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></circle>
                        <path d="M16.811,14.055A3.5,3.5,0,0,1,23.5,15.5v3H22l-.5,5h-3l-.5-5H17" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                        <path d="M12.361,5.123a.5.5,0,0,1-.722,0L9.565,2.96A1.441,1.441,0,0,1,9.3,1.3h0A1.44,1.44,0,0,1,11.6.922l.4.4.4-.4a1.44,1.44,0,0,1,2.307.375h0a1.441,1.441,0,0,1-.27,1.663Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2D3F63] text-sm font-sans">A+ Rating</h4>
                      <p className="text-xs text-[#505051] font-sans">84,000+ Families Served Since 2020</p>
                    </div>
                  </div>

                  {/* Badge 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 text-[#2D3F63] shrink-0">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <title>real-estate-insurance-dollar-hand</title>
                        <path d="M12,5.25l9,6.75V21.5a1,1,0,0,1-1,1H3a1,1,0,0,1-1-1V12Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <polyline points="2.5 12.375 12 4.5 21.5 12.375" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></polyline>
                        <polyline points="12 4.5 12 .5 15.5 .5 15.5 3.125" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></polyline>
                        <path d="M14.5,15.5H10a2.5,2.5,0,0,1,0-5h5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <path d="M9.5,15.5a2.5,2.5,0,0,0,5,0" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="12.25" x2="12.25" y1="9.5" y2="16.5"></line>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2D3F63] text-sm font-sans">Get Up to $1 Million in Coverage!</h4>
                      <p className="text-xs text-[#505051] font-sans">You could qualify for up to $1 million or more!</p>
                    </div>
                  </div>

                  {/* Badge 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 text-[#2D3F63] shrink-0">
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <title>professions-woman-doctor-2</title>
                        <circle cx="12" cy="7.5" r="4" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M12,11.5a10.933,10.933,0,0,0-7.3,2.834,2,2,0,0,0-.7,1.5V23.5h16V15.834a2,2,0,0,0-.7-1.5A10.933,10.933,0,0,0,12,11.5Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <path d="M12.02,16.5c1.387,0,4.49-1.721,4.932-4.365a1,1,0,0,1,.572-.747C18.6,10.9,18.872,8.937,18,8.5c.5-2.986.5-8-5.982-8s-6.477,5.014-5.981,8c-.871.436-.6,2.4.478,2.888a1,1,0,0,1,.572.747C7.53,14.78,10.633,16.5,12.02,16.5Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                        <circle cx="6.5" cy="22.001" r="1.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></circle>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }} x1="6.5" x2="6.5" y1="20.501" y2="17.001"></line>
                        <path d="M11,15a1.5,1.5,0,0,0-3,0" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                        <circle cx="17.5" cy="22.001" r="1.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></circle>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }} x1="17.5" x2="17.5" y1="20.501" y2="17.001"></line>
                        <path d="M16,15a1.5,1.5,0,0,1,3,0" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2D3F63] text-sm font-sans">Fast Approval Process</h4>
                      <p className="text-xs text-[#505051] font-sans">You can get approved without any medical exams</p>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-[#EAEAEB]">
                  <p className="text-xs text-[#505051] font-medium flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#30AB66] animate-pulse"></span>
                    Over <strong className="text-[#0A0908]">{visitorCount.toLocaleString()}</strong> homeowners checked their eligibility this month
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BENEFICIARY */}
          {currentStep === "beneficiary" && (
            <div className="space-y-6 animate-fadeIn w-full max-w-[400px] mx-auto pt-[5px] pb-[20px]">
              <div className="text-center">
                <h2 
                  className="text-[#2D3F63] font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  Who will your policy payout to?
                </h2>
                <p className="text-sm text-[#505051] mt-2">
                  Choose an option below. If you don&apos;t know yet, don&apos;t worry - you can change it later:
                </p>
              </div>

              {/* 2X2 GRID */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {[
                  {
                    label: "Spouse or partner",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white">
                        <title>couples-couple-2</title>
                        <circle cx="7" cy="6.5" r="2.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M7,10.5a5.941,5.941,0,0,0-4.3,1.934,1,1,0,0,0-.2.566V20.5H11.5v-7.5a1,1,0,0,0-.2-.566A5.941,5.941,0,0,0,7,10.5Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <circle cx="17" cy="6.5" r="2.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M17,10.5a5.941,5.941,0,0,1,4.3,1.934,1,1,0,0,1,.2.566V20.5H12.5v-7.5a1,1,0,0,1,.2-.566A5.941,5.941,0,0,1,17,10.5Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                      </svg>
                    )
                  },
                  {
                    label: "Children",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white">
                        <title>family-child</title>
                        <circle cx="12" cy="10.25" r="2.25" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M10.312,21.5,10.5,23h3l.75-6h1.5V14.75a3.75,3.75,0,0,0-6-3" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <circle cx="4" cy="8.249" r="2.75" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></circle>
                        <path d="M7.189,14.055A3.5,3.5,0,0,0,.5,15.5v3H2l.5,5h3l.5-5H7" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                        <circle cx="20" cy="8.249" r="2.75" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></circle>
                        <path d="M16.811,14.055A3.5,3.5,0,0,1,23.5,15.5v3H22l-.5,5h-3l-.5-5H17" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                        <path d="M12.361,5.123a.5.5,0,0,1-.722,0L9.565,2.96A1.441,1.441,0,0,1,9.3,1.3h0A1.44,1.44,0,0,1,11.6.922l.4.4.4-.4a1.44,1.44,0,0,1,2.307.375h0a1.441,1.441,0,0,1-.27,1.663Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }}></path>
                      </svg>
                    )
                  },
                  {
                    label: "Grandchildren",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white">
                        <title>family-grandchildren</title>
                        <circle cx="7" cy="7.5" r="2.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M7,11.5a5.941,5.941,0,0,0-4.3,1.934,1,1,0,0,0-.2.566V21.5H11.5v-6.5a1,1,0,0,0-.2-.566A5.941,5.941,0,0,0,7,11.5Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <circle cx="17" cy="8.5" r="1.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M17,11a3.469,3.469,0,0,0-2.5,1.144V10.5h-2v11h2v-6.5a1.5,1.5,0,0,1,3,0v6.5h2v-7.5A3.5,3.5,0,0,0,17,11Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                      </svg>
                    )
                  },
                  {
                    label: "Other",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white">
                        <title>user-single-neutral-shield</title>
                        <circle cx="12" cy="7.5" r="4" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M12,12.5A9.451,9.451,0,0,0,3.353,17.5a1.5,1.5,0,0,0-.353.94V23.5H21V18.44a1.5,1.5,0,0,0-.353-.94A9.451,9.451,0,0,0,12,12.5Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <path d="M12,14.5l3.5,1.5v3.664a4.417,4.417,0,0,1-3.5,4.336,4.417,4.417,0,0,1-3.5-4.336V16Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                      </svg>
                    )
                  }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleBeneficiarySelect(item.label)}
                    className="aspect-square flex flex-col items-center justify-center p-4 rounded-[10px] bg-[#BF323A] hover:bg-[#ca545a] active:scale-[0.98] transition-all text-center cursor-pointer border border-[#D0D0D0]/30 shadow-sm"
                  >
                    <div className="mb-3 shrink-0 flex items-center justify-center w-12 h-12">{item.icon}</div>
                    <span className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: ZIP CODE */}
          {currentStep === "zip" && (
            <div className="space-y-6 animate-fadeIn w-full max-w-[400px] mx-auto pt-[5px] pb-[20px]">
              <div className="text-center">
                <h2 
                  className="text-[#2D3F63] font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  Please confirm your zip code
                </h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    pattern="[0-9]*"
                    maxLength={5}
                    placeholder="Enter your zip code"
                    value={zip}
                    onChange={(e) => {
                      setZip(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className={`w-full h-[49px] px-[10.8px] py-[9px] bg-white border-2 rounded-[5px] text-lg text-[#2D3F63] font-sans placeholder:text-slate-300 focus:outline-none focus:border-[#BF323A] transition-colors ${
                      error ? "border-red-500" : "border-[#EAEAEB]"
                    }`}
                  />
                  {error && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1 animate-shake">
                      <span>⚠️</span> {error}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full h-[50px] rounded-[7.5px] bg-[#BF323A] hover:bg-[#ca545a] active:scale-[0.98] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <span className="text-white font-bold">Next</span>
                  <span className="text-white text-lg">→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: NAME */}
          {currentStep === "name" && (
            <div className="space-y-6 animate-fadeIn w-full max-w-[400px] mx-auto pt-[5px] pb-[20px]">
              <div className="text-center">
                <h2 
                  className="text-[#2D3F63] font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  What&apos;s your name?
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className={`w-full h-[49px] px-[10.8px] py-[9px] bg-white border-2 rounded-[5px] text-lg text-[#2D3F63] font-sans placeholder:text-slate-300 focus:outline-none focus:border-[#BF323A] transition-colors ${
                      error ? "border-red-500" : "border-[#EAEAEB]"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className={`w-full h-[49px] px-[10.8px] py-[9px] bg-white border-2 rounded-[5px] text-lg text-[#2D3F63] font-sans placeholder:text-slate-300 focus:outline-none focus:border-[#BF323A] transition-colors ${
                      error ? "border-red-500" : "border-[#EAEAEB]"
                    }`}
                  />
                  {error && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1 animate-shake">
                      <span>⚠️</span> {error}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full h-[50px] rounded-[7.5px] bg-[#BF323A] hover:bg-[#ca545a] active:scale-[0.98] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <span className="text-white font-bold">Next</span>
                  <span className="text-white text-lg">→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: BENEFICIARY NAME */}
          {currentStep === "beneficiary-name" && (
            <div className="space-y-6 animate-fadeIn w-full max-w-[400px] mx-auto pt-[5px] pb-[20px]">
              <div className="text-center">
                <h2 
                  className="text-[#2D3F63] font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  What&apos;s the name of the person this policy should payout to?
                </h2>
                <p className="text-sm text-[#505051] mt-2">
                  Type their full name below. If you have multiple beneficiaries, seperate their names with a comma.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter their full name"
                    value={beneficiaryName}
                    onChange={(e) => {
                      setBeneficiaryName(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className={`w-full h-[49px] px-[10.8px] py-[9px] bg-white border-2 rounded-[5px] text-lg text-[#2D3F63] font-sans placeholder:text-slate-300 focus:outline-none focus:border-[#BF323A] transition-colors ${
                      error ? "border-red-500" : "border-[#EAEAEB]"
                    }`}
                  />
                  {error && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1 animate-shake">
                      <span>⚠️</span> {error}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full h-[50px] rounded-[7.5px] bg-[#BF323A] hover:bg-[#ca545a] active:scale-[0.98] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <span className="text-white font-bold">Next</span>
                  <span className="text-white text-lg">→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: EMAIL */}
          {currentStep === "email" && (
            <div className="space-y-6 animate-fadeIn w-full max-w-[400px] mx-auto pt-[5px] pb-[20px]">
              <div className="text-center">
                <h2 
                  className="text-[#2D3F63] font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  What&apos;s your email?
                </h2>
                <p className="text-sm text-[#505051] mt-2">
                  Tell us where to send your results.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className={`w-full h-[49px] px-[10.8px] py-[9px] bg-white border-2 rounded-[5px] text-lg text-[#2D3F63] font-sans placeholder:text-slate-300 focus:outline-none focus:border-[#BF323A] transition-colors ${
                      error ? "border-red-500" : "border-[#EAEAEB]"
                    }`}
                  />
                  {error && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1 animate-shake">
                      <span>⚠️</span> {error}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full h-[50px] rounded-[7.5px] bg-[#BF323A] hover:bg-[#ca545a] active:scale-[0.98] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <span className="text-white font-bold">Next</span>
                  <span className="text-white text-lg">→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: PHONE NUMBER */}
          {currentStep === "phone" && (
            <div className="space-y-6 animate-fadeIn w-full max-w-[400px] mx-auto pt-[5px] pb-[20px]">
              <div className="text-center">
                <h2 
                  className="text-[#2D3F63] font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  Almost done! What&apos;s your mobile phone number?
                </h2>
                <p className="text-sm text-[#505051] mt-2">
                  Complete this final step to confirm your eligibility.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="h-[49px] px-3 bg-white border-2 border-[#EAEAEB] rounded-[5px] flex items-center gap-1.5 shrink-0 text-sm font-semibold text-[#2D3F63] font-sans">
                      <span className="text-lg">🇺🇸</span>
                      <span>+1</span>
                    </div>
                    <input
                      type="tel"
                      placeholder="Enter mobile phone number"
                      value={phone}
                      onChange={(e) => {
                        // Strip non-digits and format as 10-digit number
                        const digits = e.target.value.replace(/\D/g, "");
                        setPhone(digits);
                        setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      className={`w-full h-[49px] px-[10.8px] py-[9px] bg-white border-2 rounded-[5px] text-lg text-[#2D3F63] font-sans placeholder:text-slate-300 focus:outline-none focus:border-[#BF323A] transition-colors ${
                        error ? "border-red-500" : "border-[#EAEAEB]"
                      }`}
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1 animate-shake">
                      <span>⚠️</span> {error}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full h-[50px] rounded-[7.5px] bg-[#30AB66] hover:bg-[#289652] active:scale-[0.98] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <span className="text-white font-bold">Get My Quote</span>
                </button>

                <p className="text-[10px] leading-[1.4] text-[#505051] text-center pt-2 font-sans">
                  By clicking the &quot;Get My Quote&quot; button, I expressly consent by electronic signature to receive communications via automatic telephone dialing system or by artificial/pre-recorded message, email, or by text message from this website and multiple partner companies or their agents at the telephone number above (even if my number is currently listed on any state, federal, local, or corporate Do Not Call list) including my wireless number if provided. Carrier message and data rates may apply. I understand that my consent is not required as a condition of purchasing any goods or services and that I may revoke my consent at any time. I also acknowledge that I have read and agree to the Privacy Policy and Terms &amp; Conditions.
                </p>
              </div>
            </div>
          )}

          {/* STEP 8: LOADING SCREEN */}
          {currentStep === "loading" && (
            <div className="space-y-8 animate-fadeIn max-w-[400px] mx-auto pt-[30px] pb-[20px] text-center">
              <div className="space-y-4">
                <h2 
                  className="text-2xl md:text-3xl font-bold text-[#2D3F63]"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  Almost done!
                </h2>
                <p className="text-sm text-[#505051] font-sans">
                  Reviewing your answers and confirming your eligibility...
                </p>
              </div>
              {/* LOADING CHECKLIST */}
              <div className="text-left space-y-4 max-w-[400px] mx-auto">
                {[
                  {
                    label: "Analyzing your coverage needs",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <path d="M12,21.5A9.5,9.489,0,0,1,3.5,15.116V21.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <path d="M12,2.5a9.5,9.5,0,1,1-9.5,9.5V8.884" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="12" x2="12" y1="2.5" y2="12"></line>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="12" x2="21.5" y1="12" y2="12"></line>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="12" x2="5.283" y1="12" y2="18.717"></line>
                      </svg>
                    )
                  },
                  {
                    label: "Finding the best coverage options for you based on your needs",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <circle cx="10" cy="10" r="7.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="15.303" x2="21.5" y1="15.303" y2="21.5"></line>
                      </svg>
                    )
                  },
                  {
                    label: "Finalizing calculations",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <rect x="2" y="2.5" width="20" height="19" rx="2" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></rect>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="2" x2="22" y1="7.5" y2="7.5"></line>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="7" x2="7" y1="7.5" y2="21.5"></line>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="12" x2="12" y1="7.5" y2="21.5"></line>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="17" x2="17" y1="7.5" y2="21.5"></line>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="2" x2="22" y1="12.5" y2="12.5"></line>
                        <line style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }} x1="2" x2="22" y1="17.5" y2="17.5"></line>
                      </svg>
                    )
                  },
                  {
                    label: "Matching you a with local licensed broker to finalize your coverage",
                    icon: (
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <circle cx="12" cy="12" r="9.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M13.5,18.75a8.934,8.934,0,0,0,1.5,4.5H9a8.934,8.934,0,0,0,1.5-4.5" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                        <circle cx="12" cy="14.25" r="2.25" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></circle>
                        <path d="M12,16.5c-2.433,0-5.18,1.442-5.9,3.8a.5.5,0,0,0,.4.7H15.5a.5.5,0,0,0,.4-.7C17.18,17.942,14.433,16.5,12,16.5Z" style={{ fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5px" }}></path>
                      </svg>
                    )
                  }
                ].map((item, idx) => (
                  <div key={item.label} className="flex items-start gap-4 py-2 border-b border-[#EAEAEB]/40 last:border-0">
                    <div className="shrink-0 w-6 h-6 flex items-center justify-center mt-0.5">
                      {loadingStep > idx ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#30AB66" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 animate-scaleIn">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : loadingStep === idx ? (
                        <Loader2 className="w-4 h-4 text-[#BF323A] animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm transition-colors duration-300 font-sans ${loadingStep >= idx ? "text-[#0A0908] font-semibold" : "text-slate-300"}`}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* STEP 9: CONGRATS */}
          {currentStep === "congrats" && (
            <div className="w-full max-w-[780px] mx-auto py-12 px-4 md:px-6">
              <div 
                className="w-full rounded-[10px] p-4 md:p-6 text-center space-y-6"
                style={{
                  border: "3px solid rgba(26, 59, 118, 0.2)",
                  backgroundColor: "rgba(26, 59, 118, 0.024)"
                }}
              >
                <div className="space-y-3">
                  <h2 
                    className="text-3xl md:text-4xl font-bold text-[#2D3F63] flex items-center justify-center gap-2"
                    style={{ fontFamily: "'Alata', sans-serif", fontSize: "32px", lineHeight: "1.35", letterSpacing: "0.05em" }}
                  >
                    <span>✅</span> <span>CONGRATULATIONS!</span>
                  </h2>
                  <p className="text-base font-bold text-[#0A0908] font-sans">You&apos;re pre-qualified</p>
                  <p className="text-sm text-[#505051] leading-relaxed max-w-xl mx-auto font-sans">
                    We&apos;ve matched you with a State- Licensed Specialist from our team who is currently reviewing your responses to find you the best options possible. We will contact you in 24 hours or less.
                  </p>
                </div>
                {/* WARNING BOX */}
                <div 
                  className="rounded-[10px] p-4 text-center space-y-2 max-w-xl mx-auto"
                  style={{
                    border: "3px solid rgba(26, 59, 118, 0.2)",
                    backgroundColor: "rgba(26, 59, 118, 0.024)",
                    marginLeft: "auto",
                    marginRight: "auto"
                  }}
                >
                  <h4 className="font-bold text-[#BF323A] text-sm tracking-wide font-sans">⚠️ FINAL STEP:</h4>
                  <h3 className="font-extrabold text-[#2D3F63] text-base font-sans">VERIFY &amp; REVIEW YOUR OPTIONS</h3>
                  <p className="text-xs text-[#505051] leading-relaxed font-sans">
                    Your specialist will reach out shortly to show you the options, answer your questions, and finalize your coverage.
                  </p>
                  <p className="text-xs font-bold text-[#BF323A] font-sans">Please keep your phone line open.</p>
                </div>
                {/* WHAT TO EXPECT */}
                <div className="space-y-4 max-w-xl mx-auto text-left pt-4">
                  <h4 className="font-bold text-[#2D3F63] text-sm font-sans text-center">Here&apos;s what you can expect next:</h4>
                  <div className="space-y-4">
                    {[
                      {
                        title: "Answer the Call",
                        desc: "Please pick up even if you do not recognize the number.",
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        )
                      },
                      {
                        title: "Confirm Details",
                        desc: "The specialist will verify your age and other answers.",
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                        )
                      },
                      {
                        title: "View Options",
                        desc: "Once verified, you will receive your exact quotes and coverage amounts.",
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )
                      }
                    ].map((step, idx) => (
                      <div key={step.title} className="flex gap-4 items-start py-1">
                        <div className="w-6 h-6 text-[#BF323A] shrink-0 mt-0.5 flex items-center justify-center">
                          {step.icon}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-bold text-sm text-[#2D3F63] font-sans">{idx + 1}. {step.title}</h5>
                          <p className="text-xs text-[#505051] mt-0.5 font-sans">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {currentStep === "over80_redirect" && (
            <div className="space-y-8 animate-fadeIn max-w-lg mx-auto py-12 text-center">
              <div className="space-y-3">
                <h2 
                  className="text-2xl md:text-3xl font-bold text-[#2D3F63]"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", lineHeight: "1.35" }}
                >
                  Specialized Senior Care Needed
                </h2>
                <p className="text-sm text-[#505051] leading-relaxed max-w-md mx-auto">
                  For ages over 80, we offer specialized senior benefit programs. We are routing you to our dedicated senior protection desk.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#EAEAEB] shadow-sm space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#BF323A] tracking-wider uppercase">Dedicated Senior Line</p>
                  <p className="text-3xl font-extrabold text-[#2D3F63]">1-800-555-5555</p>
                  <p className="text-xs text-[#505051]">Call now to speak with an agent immediately.</p>
                </div>

                <a
                  href="tel:+18005555555"
                  className="w-full py-4 rounded-[15px] bg-[#BF323A] hover:bg-[#ca545a] active:scale-[0.98] text-white font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="text-white font-bold">Call Senior Protection Desk</span>
                </a>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#F6FBFF] border-t border-[#EAEAEB]/50 py-8 px-4 text-center space-y-3 mt-auto">
        <p className="text-xs text-[#505051] font-sans">
          Copyright &copy; 2026 American Benefits
        </p>
        <div className="flex justify-center gap-4 text-xs font-semibold text-[#2D3F63] font-sans">
          <a href="#" className="hover:text-[#BF323A] transition-colors cursor-pointer">
            Privacy Policy
          </a>
          <span className="text-slate-300">|</span>
          <a href="#" className="hover:text-[#BF323A] transition-colors cursor-pointer">
            Terms &amp; Conditions
          </a>
        </div>
      </footer>
    </div>
  );
}
