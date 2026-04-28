import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "./App.css";
import logoImage from "./gct.png";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const normalizedApiBase = API_BASE.replace(/\/$/, "");
const UPLOAD_BASE = (
  import.meta.env.VITE_UPLOAD_BASE ||
  normalizedApiBase.replace(/\/api$/, "/uploads")
).replace(/\/$/, "");

const api = (path) => `${normalizedApiBase}${path}`;

function getPhotoSource(photo) {
  if (!photo) return "";
  if (
    photo.startsWith("data:") ||
    photo.startsWith("http://") ||
    photo.startsWith("https://")
  ) {
    return photo;
  }

  return `${UPLOAD_BASE}/${photo}`;
}

async function loadPhotoDataUrl(photo) {
  const source = getPhotoSource(photo);
  if (!source) return "";
  if (source.startsWith("data:")) return source;

  const response = await fetch(source);
  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error("Unable to load photo."));
    reader.readAsDataURL(blob);
  });
}

async function parseJsonSafe(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getApiErrorMessage(parsedBody, fallbackMessage) {
  if (parsedBody?.error) return parsedBody.error;
  if (parsedBody?.message) return parsedBody.message;
  return fallbackMessage;
}

function getUserFriendlyError(error, fallbackMessage) {
  if (error instanceof TypeError) {
    return "Unable to connect to the server. Make sure the backend is running on http://localhost:4000.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

const emptyPlayers = Array.from({ length: 8 }, () => ({
  name: "",
  photo: null,
}));

function App() {
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState(emptyPlayers);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");

  useEffect(() => {
    fetchRegistrations();
  }, []);

  async function fetchRegistrations() {
    setLoading(true);
    try {
      const response = await fetch(api("/registrations"));

      const data = await parseJsonSafe(response);
      if (!data) {
        const contentType = response.headers.get("content-type") || "";
        console.error("Response is not JSON:", response.status, contentType);
        setError(
          "Server error: Invalid response format. Make sure the backend server is running on port 4000.",
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(data, "Unable to load registrations."),
        );
      }

      setRegistrations(data);

      // Check if user's team has been approved
      if (userEmail) {
        const userRegistration = data.find(
          (reg) => reg.userEmail === userEmail && reg.status === "approved",
        );
        if (userRegistration && !approvalMessage) {
          setApprovalMessage("Your team has been selected successfully!");
          // Clear message after 10 seconds
          setTimeout(() => setApprovalMessage(""), 10000);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        "Unable to load registrations. Make sure the backend server is running on http://localhost:4000",
      );
    } finally {
      setLoading(false);
    }
  }

  function updatePlayer(index, field, value) {
    setPlayers((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleLogin(event) {
    event.preventDefault();
    setLoginError("");
    const email = loginEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setLoginError("Please enter your email.");
      return;
    }
    if (!emailPattern.test(email)) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    setUserEmail(email);
    setLoginEmail("");
    setLoginSuccess("You have successfully logged in to GCT portal!");

    // Clear success message after 5 seconds
    setTimeout(() => setLoginSuccess(""), 5000);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const trimmedPlayers = players.map((p) => ({
      name: p.name.trim(),
      photo: p.photo,
    }));
    if (!teamName.trim() || trimmedPlayers.some((p) => !p.name || !p.photo)) {
      setError(
        "Please enter a team name, all player names, and upload photos for all players.",
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("teamName", teamName.trim());
      formData.append("userEmail", userEmail);
      trimmedPlayers.forEach((player, index) => {
        formData.append(`player${index + 1}`, player.name);
        formData.append(`photo${index + 1}`, player.photo);
      });
      const response = await fetch(api("/registrations"), {
        method: "POST",
        body: formData,
      });
      const result = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(result, "Registration failed."));
      }
      setMessage("Registration sent. Wait for admin approval.");
      setTeamName("");
      setPlayers(emptyPlayers);
      setSubmitted(true);
      fetchRegistrations();
    } catch (err) {
      setError(
        getUserFriendlyError(err, "Unable to submit registration right now."),
      );
    }
  }

  async function decideRegistration(id, status) {
    setError("");
    try {
      if (status === "rejected") {
        // Delete rejected registration
        const response = await fetch(api(`/registrations/${id}`), {
          method: "DELETE",
        });
        const result = await parseJsonSafe(response);
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(result, "Unable to delete registration."),
          );
        }
        setMessage("Registration rejected and removed.");
      } else {
        // Approve registration
        const response = await fetch(api(`/registrations/${id}/decision`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const result = await parseJsonSafe(response);
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(result, "Unable to update decision."),
          );
        }
        setMessage("Registration approved successfully.");
      }
      fetchRegistrations();
    } catch (err) {
      setError(
        getUserFriendlyError(err, "Unable to update registration status."),
      );
    }
  }

  async function generatePDFWithPhotos(registration) {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 12;
    const photoSize = 35;
    const playersPerRow = 4;
    const photoSpacing = 12; // Space between photos
    const totalPhotoWidth =
      playersPerRow * photoSize + (playersPerRow - 1) * photoSpacing;
    const startX = (pageWidth - totalPhotoWidth) / 2;

    let yPos = margin;

    // Add title
    doc.setFontSize(22);
    doc.text("GCT Cricket Team", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Add team details
    doc.setFontSize(14);
    doc.text(`Team name: ${registration.teamName}`, pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 8;
    doc.setFontSize(10);
    doc.text(
      `Date: ${new Date(registration.createdAt).toLocaleDateString()}`,
      pageWidth / 2,
      yPos,
      { align: "center" },
    );
    yPos += 18;

    // Create grid layout for players
    for (let index = 0; index < registration.players.length; index++) {
      const player = registration.players[index];
      const photoFile = registration.photos[index];

      // Calculate position in grid
      const row = Math.floor(index / playersPerRow);
      const col = index % playersPerRow;

      const xPos = startX + col * (photoSize + photoSpacing);
      const playerYPos = yPos + row * 75;

      // Check if we need a new page
      if (playerYPos + 70 > pageHeight - margin) {
        doc.addPage();
        yPos = margin + 15;
        const newRow = Math.floor(index / playersPerRow);
        const newPlayerYPos = yPos + (newRow % playersPerRow) * 75;
        const xPos2 = startX + col * (photoSize + photoSpacing);

        try {
          // Load and embed photo
          const img = await loadPhotoDataUrl(photoFile);

          // Add photo
          doc.addImage(img, "JPEG", xPos2, newPlayerYPos, photoSize, photoSize);

          // Add player name below photo (centered under photo)
          doc.setFontSize(9);
          const label = index === 0 ? "Captain" : `P${index + 1}`;
          doc.text(
            `${label}:`,
            xPos2 + photoSize / 2,
            newPlayerYPos + photoSize + 6,
            { align: "center" },
          );
          doc.setFontSize(8);
          doc.text(
            player,
            xPos2 + photoSize / 2,
            newPlayerYPos + photoSize + 11,
            { align: "center", maxWidth: photoSize + 5 },
          );
        } catch (err) {
          console.error(`Failed to load photo for ${player}:`, err);
          doc.setFontSize(9);
          doc.text(
            player,
            xPos2 + photoSize / 2,
            newPlayerYPos + photoSize + 6,
            { align: "center", maxWidth: photoSize + 5 },
          );
        }
      } else {
        try {
          // Load and embed photo
          const img = await loadPhotoDataUrl(photoFile);

          // Add photo
          doc.addImage(img, "JPEG", xPos, playerYPos, photoSize, photoSize);

          // Add player name below photo (centered under photo)
          doc.setFontSize(9);
          const label = index === 0 ? "Captain" : `P${index + 1}`;
          doc.text(
            `${label}:`,
            xPos + photoSize / 2,
            playerYPos + photoSize + 6,
            { align: "center" },
          );
          doc.setFontSize(8);
          doc.text(player, xPos + photoSize / 2, playerYPos + photoSize + 11, {
            align: "center",
            maxWidth: photoSize + 5,
          });
        } catch (err) {
          console.error(`Failed to load photo for ${player}:`, err);
          doc.setFontSize(9);
          doc.text(player, xPos + photoSize / 2, playerYPos + photoSize + 6, {
            align: "center",
            maxWidth: photoSize + 5,
          });
        }
      }
    }

    // Add footer
    doc.setFontSize(9);
    doc.text(
      "Generated by GCT Registration System",
      pageWidth / 2,
      pageHeight - margin + 5,
      {
        align: "center",
      },
    );

    // Save the PDF
    doc.save(`${registration.teamName}_team_roster.pdf`);
  }

  function generatePDF(registration) {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text("GCT Cricket Team Registration", 20, 30);

    // Add team details
    doc.setFontSize(16);
    doc.text(`Team Name: ${registration.teamName}`, 20, 50);
    doc.text(
      `Registration Date: ${new Date(registration.createdAt).toLocaleDateString()}`,
      20,
      65,
    );
    doc.text(`Status: ${registration.status.toUpperCase()}`, 20, 80);

    // Add players
    doc.setFontSize(14);
    doc.text("Team Players:", 20, 100);

    registration.players.forEach((player, index) => {
      const yPos = 115 + index * 15;
      doc.setFontSize(12);
      doc.text(
        `${index === 0 ? "Captain" : `Player ${index + 1}`}: ${player}`,
        30,
        yPos,
      );
    });

    // Add footer
    doc.setFontSize(10);
    doc.text("Generated by GCT Registration System", 20, 280);

    // Save the PDF
    doc.save(`${registration.teamName}_registration.pdf`);
  }

  const isLoggedIn = Boolean(userEmail);

  // Check if user has an approved team
  const userApprovedRegistration = registrations.find(
    (reg) => reg.userEmail === userEmail && reg.status === "approved",
  );

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <div id="logo">
            <h1>GCT REGISTRATION OF CRICKET TEAM</h1>
            <img src={logoImage} alt="GCT logo" />
          </div>
          <p>
            Register 8 players then Committee member check Waseem Shahzad &
            Rizwan Ali .If your team is Acceptable then you well get
            notification
          </p>
        </div>
      </header>

      <main className="grid-layout">
        {!isLoggedIn ? (
          <section className="card form-card">
            <h2>Login with your email</h2>
            <form onSubmit={handleLogin}>
              <label>
                Email address
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <button type="submit">Continue</button>
            </form>
            {loginError && <p className="error">{loginError}</p>}
            {loginSuccess && <p className="success">{loginSuccess}</p>}
            <p className="hint">
              Enter your email to continue and access the GCT team registration
              form.
            </p>
          </section>
        ) : (
          <>
            <section className="card form-card">
              <h2>Welcome, {userEmail}</h2>
              {approvalMessage && (
                <p
                  className="success"
                  style={{ fontSize: "1.2rem", fontWeight: "bold" }}
                >
                  {approvalMessage}
                </p>
              )}
              <p className="hint">
                Use your email session to register a cricket team.
              </p>
              <form onSubmit={handleSubmit}>
                <label>
                  Team Name
                  <input
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Enter team name"
                  />
                </label>

                <div className="players-grid">
                  {players.map((player, index) => (
                    <div key={index} className="player-input">
                      <label>
                        {index === 0 ? "Captain" : `Player ${index + 1}`}
                        <input
                          type="text"
                          value={player.name}
                          onChange={(event) =>
                            updatePlayer(index, "name", event.target.value)
                          }
                          placeholder={
                            index === 0 ? "Captain" : `Player ${index + 1}`
                          }
                        />
                      </label>
                      <label>
                        Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            updatePlayer(index, "photo", event.target.files[0])
                          }
                          className="photo-input"
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <button type="submit">Submit Registration</button>
              </form>
              {error && <p className="error">{error}</p>}
              {message && <p className="success">{message}</p>}
              {submitted && (
                <p className="hint">
                  After admin review, the status appears below.
                </p>
              )}
            </section>

            <section className="card admin-card">
              <div className="section-header">
                <div>
                  <b>GCT</b>
                  <h2>Admin Panel of </h2>
                  <p>Approve or reject registrations.</p>
                </div>
              </div>

              {loading ? (
                <p>Loading registrations...</p>
              ) : registrations.length === 0 ? (
                <p>No registrations yet.</p>
              ) : (
                <div className="registration-list">
                  {registrations.map((registration) => (
                    <article
                      key={registration.id}
                      className="registration-item"
                    >
                      <div className="summary-row">
                        <div>
                          <strong>{registration.teamName}</strong>
                          <p>
                            {new Date(registration.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={`status badge ${registration.status}`}>
                          {registration.status === "approved"
                            ? "Select"
                            : registration.status === "rejected"
                              ? "Reject"
                              : "Pending"}
                        </span>
                      </div>
                      <div className="players-grid">
                        {registration.players.map((player, index) => (
                          <div key={index} className="player-card">
                            <img
                              src={getPhotoSource(registration.photos[index])}
                              alt={`${player} photo`}
                              style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "8px",
                              }}
                            />
                            <p
                              style={{ margin: "8px 0 0 0", fontWeight: "500" }}
                            >
                              {player}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="button-row">
                        {registration.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => generatePDFWithPhotos(registration)}
                            style={{
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              padding: "0.5rem 1rem",
                              borderRadius: "6px",
                              fontWeight: "500",
                              cursor: "pointer",
                              marginRight: "0.5rem",
                            }}
                          >
                            Generate PDF
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            decideRegistration(registration.id, "approved")
                          }
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          className="reject"
                          onClick={() =>
                            decideRegistration(registration.id, "rejected")
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
