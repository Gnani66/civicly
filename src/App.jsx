// src/App.jsx
import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { getContract } from "./web3";

function App() {
  // -------- NAV + VIEW STATE ----------
  const [activeTab, setActiveTab] = useState("report");

  // -------- REPORTER STATE -----------
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState("");
  const [location, setLocation] = useState("");

  const [imageHash, setImageHash] = useState("");
  const [aiHash, setAiHash] = useState("");

  const [total, setTotal] = useState(null);
  const [allReports, setAllReports] = useState([]);

  // -------- WALLET STATE -------------
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("");

  // ================= BALANCE FETCH HELPER =================
  const fetchBalance = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balanceWei = await provider.getBalance(address);
      return ethers.formatEther(balanceWei);
    } catch (err) {
      console.error("Balance fetch error:", err);
      return "0";
    }
  };

  // ================= WALLET FUNCTIONS =================
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask to use wallet features.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const balanceEth = await fetchBalance(address);

      setWalletAddress(address);
      setWalletBalance(balanceEth);
    } catch (err) {
      console.error(err);
      alert("Failed to connect wallet.");
    }
  };

  // ================= CONTRACT HELPERS =================
  const loadReports = async () => {
    const contract = await getContract();
    if (!contract) return;

    try {
      const count = await contract.totalReports();
      setTotal(Number(count));
    } catch (err) {
      console.error(err);
      alert("Failed to load total reports.");
    }
  };

  const loadAllReports = async () => {
    const contract = await getContract();
    if (!contract) return;

    try {
      const count = await contract.totalReports();
      const total = Number(count);
      const reports = [];

      for (let i = 0; i < total; i++) {
        const r = await contract.reports(i);
        reports.push({
          id: i,
          reporter: r.reporter,
          imageHash: r.imageHash,
          issueType: r.issueType,
          baseSeverity: Number(r.baseSeverity),
          adjustedSeverity: Number(r.adjustedSeverity),
          location: r.location,
          timestamp: Number(r.timestamp),
          aiHash: r.aiHash,
          aiVerified: r.aiVerified,
        });
      }

      setAllReports(reports);
    } catch (err) {
      console.error(err);
      alert("Failed to load reports.");
    }
  };

  // ================= IMAGE & AI =================
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const analyzeImage = async () => {
    if (!image) return alert("Upload an image first!");

    const formData = new FormData();
    formData.append("image", image);

    try {
      const res = await axios.post("http://localhost:5000/analyze", formData);
      const data = res.data;

      setIssueType(data.issueType);
      setSeverity(data.severity);
      setImageHash(data.imageHash);
      setAiHash(data.aiHash);

      alert("Image analyzed successfully!");
    } catch (err) {
      console.error(err);
      alert("Error analyzing image.");
    }
  };

  // ================= SUBMIT ISSUE (UPDATED WITH BALANCE REFRESH) =================
  const submitIssue = async () => {
    if (!issueType || !severity || !location) {
      alert("Please analyze image and fill all fields.");
      return;
    }

    const contract = await getContract();
    if (!contract) return;

    try {
      // 1️⃣ Submit issue
      const tx = await contract.submitIssue(
        imageHash,
        issueType,
        Number(severity),
        location
      );

      const receipt = await tx.wait();
      alert("Issue submitted!");

      // 🔄 Refresh balance after 1st transaction
      if (walletAddress) {
        const newBalance = await fetchBalance(walletAddress);
        setWalletBalance(newBalance);
      }

      // Extract Report ID
      const reportId = Number(receipt.logs[0].args[0]);

      // 2️⃣ Submit AI hash
      const tx2 = await contract.submitAIHash(reportId, "0x" + aiHash);
      await tx2.wait();

      alert("AI hash submitted!");

      // 🔄 Refresh balance again after 2nd transaction
      if (walletAddress) {
        const newBalance2 = await fetchBalance(walletAddress);
        setWalletBalance(newBalance2);
      }

      loadReports();
    } catch (error) {
      console.error(error);
      alert("Error submitting issue");
    }
  };

  // ================= DASHBOARD DERIVED STATS =================
  const totalCritical = allReports.filter((r) => r.adjustedSeverity >= 7).length;
  const totalVerified = allReports.filter((r) => r.aiVerified).length;

  // ================= RENDER =================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 0% 0%, #1b1b4f, #050515 60%)",
        color: "#f9fafb",
        fontFamily: "Poppins, system-ui, sans-serif",
      }}
    >
      {/* ===== TOP NAVBAR ===== */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 40px",
          background: "rgba(8, 8, 35, 0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(18px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src="civicly.jpg"
            alt="App Logo"
            style={{
              height: "40px",
              width: "40px",
              borderRadius: "999px",
              objectFit: "cover",
              boxShadow: "0 0 18px rgba(56, 189, 248, 0.6)",
            }}
          />
          <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>Civicly</span>
        </div>

        <nav style={{ display: "flex", gap: "10px" }}>
          {["report", "dashboard", "wallet"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: "none",
                padding: "8px 16px",
                borderRadius: "999px",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: 500,
                background:
                  activeTab === tab
                    ? "linear-gradient(120deg, #4f46e5, #06b6d4)"
                    : "transparent",
                color: activeTab === tab ? "#fff" : "#9ca3af",
                boxShadow:
                  activeTab === tab
                    ? "0 0 18px rgba(56,189,248,0.55)"
                    : "none",
                transition: "all 0.2s ease-out",
              }}
            >
              {tab === "report"
                ? "Report"
                : tab === "dashboard"
                ? "Dashboard"
                : "Wallet"}
            </button>
          ))}
        </nav>
      </header>

      {/* ======================= MAIN CONTENT ======================= */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "24px auto 60px",
          padding: "0 20px",
        }}
      >
        {/* ---------------- REPORT TAB ---------------- */}
        {activeTab === "report" && (
          <section style={{ animation: "fadeIn 0.35s ease-out" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "18px" }}>
              Civicly – AI Powered Issue Reporter
            </h1>

            {/* Top controls */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <button
                onClick={loadReports}
                style={{
                  borderRadius: "999px",
                  padding: "8px 16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#f9fafb",
                  cursor: "pointer",
                }}
              >
                Load Total Reports
              </button>

              <button
                onClick={loadAllReports}
                style={{
                  borderRadius: "999px",
                  padding: "8px 16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#f9fafb",
                  cursor: "pointer",
                }}
              >
                Load All Reports
              </button>

              {total !== null && (
                <span style={{ marginLeft: "auto", color: "#9ca3af" }}>
                  Total Reports: <strong>{total}</strong>
                </span>
              )}
            </div>

            <hr style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

            {/* Upload section */}
            <h2 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>
              Upload Image
            </h2>

            <div
              style={{
                display: "flex",
                gap: "24px",
                flexWrap: "wrap",
                alignItems: "flex-start",
                marginBottom: "24px",
              }}
            >
              {preview && (
                <div
                  style={{
                    background:
                      "radial-gradient(circle at 0 0, rgba(56,189,248,0.2), #050518)",
                    borderRadius: "16px",
                    padding: "10px",
                    boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
                    maxWidth: "380px",
                  }}
                >
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      borderRadius: "12px",
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ color: "#f9fafb" }}
                />

                <button
                  onClick={analyzeImage}
                  style={{
                    marginTop: "4px",
                    borderRadius: "999px",
                    padding: "8px 18px",
                    border: "none",
                    cursor: "pointer",
                    background: "linear-gradient(130deg, #4f46e5, #06b6d4)",
                    color: "#fff",
                    boxShadow: "0 12px 30px rgba(56,189,248,0.3)",
                  }}
                >
                  Analyze Image with AI
                </button>
              </div>
            </div>

            <hr style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

            {/* Issue details */}
            <h2 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>
              Issue Details
            </h2>

            <div
              style={{
                background:
                  "radial-gradient(circle at 0 0, rgba(56,189,248,0.1), #171738)",
                borderRadius: "16px",
                padding: "18px 20px",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <label style={{ color: "#9ca3af" }}>Issue Type</label>
                <input
                  type="text"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.85)",
                    color: "#f9fafb",
                  }}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ color: "#9ca3af" }}>Severity</label>
                <input
                  type="number"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.85)",
                    color: "#f9fafb",
                  }}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ color: "#9ca3af" }}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your location"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.85)",
                    color: "#f9fafb",
                  }}
                />
              </div>

              <button
                onClick={submitIssue}
                style={{
                  marginTop: "8px",
                  borderRadius: "999px",
                  padding: "8px 18px",
                  border: "1px solid #06b6d4",
                  cursor: "pointer",
                  background: "rgba(6,182,212,0.16)",
                  color: "#06b6d4",
                }}
              >
                Submit Issue
              </button>
            </div>

            {/* All Reports */}
            <hr style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

            <h2 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>
              All Reports
            </h2>

            {allReports.length === 0 && (
              <p style={{ color: "#9ca3af" }}>No reports loaded.</p>
            )}

            {allReports.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  marginBottom: "15px",
                  background: "rgba(15,23,42,0.9)",
                }}
              >
                <p><b>Report ID:</b> {r.id}</p>
                <p><b>Reporter:</b> {r.reporter}</p>
                <p><b>Issue Type:</b> {r.issueType}</p>
                <p><b>Base Severity:</b> {r.baseSeverity}</p>
                <p><b>Adjusted Severity:</b> {r.adjustedSeverity}</p>
                <p><b>Location:</b> {r.location}</p>
                <p>
                  <b>Timestamp:</b>{" "}
                  {new Date(r.timestamp * 1000).toLocaleString()}
                </p>
                <p><b>AI Verified:</b> {r.aiVerified ? "Yes" : "No"}</p>

                {r.imageHash && (
                  <img
                    src={`https://ipfs.io/ipfs/${r.imageHash}`}
                    width="200"
                    style={{
                      borderRadius: "10px",
                      marginTop: "10px",
                    }}
                  />
                )}
              </div>
            ))}
          </section>
        )}

        {/* ---------------- DASHBOARD TAB ---------------- */}
        {activeTab === "dashboard" && (
          <section style={{ animation: "fadeIn 0.35s ease-out" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "18px" }}>Dashboard</h1>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
                marginBottom: "22px",
              }}
            >
              {/* Total */}
              <div
                style={{
                  background:
                    "radial-gradient(circle at 0 0, rgba(56,189,248,0.15), #171738)",
                  padding: "18px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <p style={{ color: "#9ca3af" }}>Total Reports</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                  {total ?? "--"}
                </p>
              </div>

              {/* Critical */}
              <div
                style={{
                  background:
                    "radial-gradient(circle at 0 0, rgba(248,250,252,0.06), #171738)",
                  padding: "18px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <p style={{ color: "#9ca3af" }}>Critical (sev ≥ 7)</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                  {totalCritical}
                </p>
              </div>

              {/* AI Verified */}
              <div
                style={{
                  background:
                    "radial-gradient(circle at 0 0, rgba(56,189,248,0.15), #171738)",
                  padding: "18px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <p style={{ color: "#9ca3af" }}>AI Verified</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                  {totalVerified}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ---------------- WALLET TAB ---------------- */}
        {activeTab === "wallet" && (
          <section style={{ animation: "fadeIn 0.35s ease-out" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "18px" }}>My Wallet</h1>

            <div
              style={{
                maxWidth: "620px",
                background:
                  "radial-gradient(circle at 0 0, rgba(56,189,248,0.1), #171738)",
                borderRadius: "16px",
                padding: "18px 20px",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <p style={{ color: "#9ca3af" }}>
                Connect your MetaMask wallet to see your address and live
                balance.
              </p>

              <button
                onClick={connectWallet}
                style={{
                  marginTop: "10px",
                  borderRadius: "999px",
                  padding: "8px 18px",
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(130deg, #4f46e5, #06b6d4)",
                  color: "#fff",
                }}
              >
                {walletAddress ? "Refresh Wallet" : "Connect MetaMask"}
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "14px",
                  marginTop: "18px",
                }}
              >
                {/* Address */}
                <div
                  style={{
                    background: "rgba(15,23,42,0.9)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                    Address
                  </span>
                  <span
                    style={{ display: "block", marginTop: "4px", wordBreak: "break-all" }}
                  >
                    {walletAddress || "Not connected"}
                  </span>
                </div>

                {/* Balance */}
                <div
                  style={{
                    background: "rgba(15,23,42,0.9)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                    Balance
                  </span>
                  <span style={{ display: "block", marginTop: "4px" }}>
                    {walletAddress ? `${walletBalance} ETH` : "--"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
