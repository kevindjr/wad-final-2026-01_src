import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Login() {
  const { login } = useContext(UserContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>CS</div>

        <h1 style={styles.title}>Course Registration</h1>
        <p style={styles.subtitle}>
          Sign in to access your courses
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email" style={styles.label}>
            Email address
          </label>

          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={styles.input}
          />

          <label htmlFor="password" style={styles.label}>
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={styles.input}
          />

          {error && (
            <p style={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>
          Online Course Service
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #f5f7ff 0%, #e7edff 50%, #d7e3ff 100%)",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "36px",
    boxSizing: "border-box",
    background: "#ffffff",
    borderRadius: "18px",
    boxShadow: "0 16px 45px rgba(49, 75, 140, 0.14)",
  },

  logo: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#4f6fe8",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "24px",
  },

  title: {
    fontSize: "27px",
    color: "#1f2a44",
    margin: "0 0 8px",
  },

  subtitle: {
    color: "#75809a",
    fontSize: "14px",
    marginBottom: "28px",
    lineHeight: 1.6,
  },

  label: {
    display: "block",
    color: "#34415c",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "8px",
  },

  input: {
    display: "block",
    width: "100%",
    padding: "12px 14px",
    marginBottom: "20px",
    boxSizing: "border-box",
    border: "1px solid #dce2ef",
    borderRadius: "9px",
    fontSize: "14px",
    outlineColor: "#4f6fe8",
    background: "#ffffff",
    color: "#1f2a44",
  },

  button: {
    display: "block",
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "9px",
    background: "#4f6fe8",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "bold",
    marginTop: "8px",
  },

  error: {
    color: "#c62828",
    background: "#fff0f0",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "13px",
  },

  footer: {
    textAlign: "center",
    color: "#8a94a9",
    fontSize: "12px",
    marginTop: "26px",
    marginBottom: 0,
  },
};