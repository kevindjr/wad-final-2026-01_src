
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../context/UserContext";

const API_URL = import.meta.env.VITE_API_URL;

const EMPTY_COURSE = {
  name: "",
  duration: 1,
  topics: "",
  price: 0,
  maxStudents: 10,
  status: "Open",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export default function Dashboard() {
  const { user, logout } = useContext(UserContext);

  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_COURSE);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState("courses");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isTeacher = user?.role === "Teacher";

  async function loadCourses(searchTerm = search) {
    setLoading(true);
    setError("");

    try {
      const query = searchTerm.trim()
        ? `?search=${encodeURIComponent(searchTerm.trim())}`
        : "";

      const data = await apiRequest(`/api/course${query}`);
      setCourses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEnrolledCourses() {
    try {
      const data = await apiRequest("/api/course/enrolled");
      setEnrolledCourses(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadCourses("");
    if (user?.role === "Student") {
      loadEnrolledCourses();
    }
  }, [user?.role]);

  async function handleSearch(event) {
    event.preventDefault();
    await loadCourses(search);
  }

  function startCreate() {
    setForm({ ...EMPTY_COURSE, topics: "" });
    setEditingId(null);
    setShowForm(true);
    setSelectedCourse(null);
    setMessage("");
    setError("");
  }

  function startEdit(course) {
    setForm({
      name: course.name,
      duration: course.duration,
      topics: Array.isArray(course.topics)
        ? course.topics.join(", ")
        : "",
      price: course.price,
      maxStudents: course.maxStudents,
      status: course.status,
    });

    setEditingId(course._id);
    setShowForm(true);
    setSelectedCourse(null);
    setMessage("");
    setError("");
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        ["duration", "price", "maxStudents"].includes(name)
          ? value
          : value,
    }));
  }

  async function handleSaveCourse(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: form.name.trim(),
      duration: Number(form.duration),
      topics: form.topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
      price: Number(form.price),
      maxStudents: Number(form.maxStudents),
      status: form.status,
    };

    try {
      const path = editingId
        ? `/api/course/${editingId}`
        : "/api/course";

      await apiRequest(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setEditingId(null);
      setMessage(editingId ? "Course updated." : "Course created.");
      await loadCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDetails(course) {
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(`/api/course/${course._id}`);
      setSelectedCourse(data);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(course) {
    if (!window.confirm(`Delete "${course.name}"?`)) return;

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/course/${course._id}`, {
        method: "DELETE",
      });

      setMessage("Course deleted.");
      if (selectedCourse?._id === course._id) {
        setSelectedCourse(null);
      }
      await loadCourses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEnroll(course) {
    setError("");
    setMessage("");

    try {
      const result = await apiRequest(
        `/api/course/${course._id}/enroll`,
        { method: "POST" }
      );

      setMessage(result.message || "Enrollment successful.");
      await loadCourses();
      await loadEnrolledCourses();

      if (selectedCourse?._id === course._id) {
        await handleDetails(course);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    setError("");

    try {
      await logout();
    } catch (err) {
      setError(err.message || "Logout failed.");
    }
  }

  function isEnrolled(course) {
    return enrolledCourses.some(
      (item) => item._id === course._id
    );
  }

  function closePanels() {
    setShowForm(false);
    setSelectedCourse(null);
    setError("");
    setMessage("");
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Online Course Service</h1>
          <p>
            Welcome, <strong>{user?.username}</strong> · {user?.role}
          </p>
        </div>

        <button onClick={handleLogout} style={styles.secondaryButton}>
          Logout
        </button>
      </header>

      <nav style={styles.nav}>
        <button
          style={view === "courses" ? styles.activeButton : styles.secondaryButton}
          onClick={() => {
            setView("courses");
            closePanels();
            loadCourses();
          }}
        >
          {isTeacher ? "My Courses" : "Browse Courses"}
        </button>

        {!isTeacher && (
          <button
            style={view === "enrolled" ? styles.activeButton : styles.secondaryButton}
            onClick={() => {
              setView("enrolled");
              closePanels();
              loadEnrolledCourses();
            }}
          >
            My Enrollments
          </button>
        )}

        {isTeacher && (
          <button onClick={startCreate} style={styles.activeButton}>
            + Create Course
          </button>
        )}
      </nav>

      {message && <p role="status" style={styles.success}>{message}</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}

      {view === "courses" && !showForm && !selectedCourse && (
        <>
          {!isTeacher && (
            <form onSubmit={handleSearch} style={styles.searchForm}>
              <input
                aria-label="Search courses or teachers"
                placeholder="Search by course or teacher name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.activeButton}>
                Search
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setSearch("");
                  loadCourses("");
                }}
              >
                Clear
              </button>
            </form>
          )}

          <h2>{isTeacher ? "My Courses" : "Available Courses"}</h2>

          {loading ? (
            <p>Loading courses...</p>
          ) : courses.length === 0 ? (
            <p>No courses found.</p>
          ) : (
            <section style={styles.grid}>
              {courses.map((course) => (
                <article key={course._id} style={styles.card}>
                  <h3>{course.name}</h3>
                  <p>Teacher: {course.teacher_name}</p>
                  <p>Duration: {course.duration} days</p>
                  <p>Price: {course.price}</p>
                  <p>
                    Students: {course.enrolledStudents ?? 0} /{" "}
                    {course.maxStudents}
                  </p>
                  <p>
                    Status: <strong>{course.status}</strong>
                  </p>

                  <div style={styles.actions}>
                    <button
                      style={styles.secondaryButton}
                      onClick={() => handleDetails(course)}
                    >
                      Details
                    </button>

                    {isTeacher && (
                      <>
                        <button
                          style={styles.secondaryButton}
                          onClick={() => startEdit(course)}
                        >
                          Edit
                        </button>
                        <button
                          style={styles.dangerButton}
                          onClick={() => handleDelete(course)}
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {!isTeacher && (
                      <button
                        style={styles.activeButton}
                        disabled={
                          course.status !== "Open" ||
                          (course.enrolledStudents ?? 0) >= course.maxStudents ||
                          isEnrolled(course)
                        }
                        onClick={() => handleEnroll(course)}
                      >
                        {isEnrolled(course)
                          ? "Already Enrolled"
                          : course.status !== "Open"
                            ? "Not Open"
                            : (course.enrolledStudents ?? 0) >= course.maxStudents
                              ? "Full"
                              : "Enroll"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}

      {view === "enrolled" && !showForm && !selectedCourse && (
        <>
          <h2>My Enrolled Courses</h2>
          {enrolledCourses.length === 0 ? (
            <p>You have not enrolled in any courses yet.</p>
          ) : (
            <section style={styles.grid}>
              {enrolledCourses.map((course) => (
                <article key={course._id} style={styles.card}>
                  <h3>{course.name}</h3>
                  <p>Teacher: {course.teacher_name}</p>
                  <p>Duration: {course.duration} days</p>
                  <p>Status: {course.status}</p>
                  <button
                    style={styles.secondaryButton}
                    onClick={() => handleDetails(course)}
                  >
                    Details
                  </button>
                </article>
              ))}
            </section>
          )}
        </>
      )}

      {showForm && (
        <section style={styles.panel}>
          <h2>{editingId ? "Update Course" : "Create Course"}</h2>

          <form onSubmit={handleSaveCourse}>
            <label style={styles.label}>
              Course Name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                required
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Duration (days)
              <input
                name="duration"
                type="number"
                min="1"
                step="1"
                value={form.duration}
                onChange={updateField}
                required
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Topics (separate with commas)
              <input
                name="topics"
                value={form.topics}
                onChange={updateField}
                placeholder="HTML, CSS, JavaScript"
                required
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Price
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={updateField}
                required
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Maximum Students
              <input
                name="maxStudents"
                type="number"
                min="1"
                step="1"
                value={form.maxStudents}
                onChange={updateField}
                required
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Status
              <select
                name="status"
                value={form.status}
                onChange={updateField}
                style={styles.input}
              >
                <option value="Open">Open</option>
                <option value="Close">Close</option>
                <option value="Cancel">Cancel</option>
              </select>
            </label>

            <div style={styles.actions}>
              <button type="submit" disabled={saving} style={styles.activeButton}>
                {saving ? "Saving..." : "Save Course"}
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={closePanels}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {selectedCourse && (
        <section style={styles.panel}>
          <h2>{selectedCourse.name}</h2>
          <p>Teacher: {selectedCourse.teacher_name}</p>
          <p>Duration: {selectedCourse.duration} days</p>
          <p>Topics: {(selectedCourse.topics || []).join(", ")}</p>
          <p>Price: {selectedCourse.price}</p>
          <p>Maximum students: {selectedCourse.maxStudents}</p>
          <p>Enrolled: {selectedCourse.enrolledCount ?? selectedCourse.enrolledStudents?.length ?? 0}</p>
          <p>Status: {selectedCourse.status}</p>

          {isTeacher && (
            <>
              <h3>Enrolled Students</h3>
              {selectedCourse.enrolledStudents?.length ? (
                <ul>
                  {selectedCourse.enrolledStudents.map((student) => (
                    <li key={student.id}>
                      {student.username} ({student.email})
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No students enrolled yet.</p>
              )}
            </>
          )}

          {!isTeacher && (
            <button
              style={styles.activeButton}
              disabled={
                selectedCourse.status !== "Open" ||
                (selectedCourse.enrolledCount ?? 0) >= selectedCourse.maxStudents ||
                isEnrolled(selectedCourse)
              }
              onClick={() => handleEnroll(selectedCourse)}
            >
              {isEnrolled(selectedCourse) ? "Already Enrolled" : "Enroll"}
            </button>
          )}

          <button
            style={{ ...styles.secondaryButton, marginLeft: 8 }}
            onClick={closePanels}
          >
            Back
          </button>
        </section>
      )}
    </main>
  );
}

const styles = {
  page: {
    maxWidth: 1100,
    margin: "40px auto",
    padding: 24,
    fontFamily: "Arial, sans-serif",
    color: "#202938",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    borderBottom: "1px solid #dce3ec",
    paddingBottom: 20,
  },
  title: { marginBottom: 8 },
  nav: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    margin: "20px 0",
  },
  searchForm: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    margin: "20px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  },
  card: {
    border: "1px solid #dce3ec",
    borderRadius: 10,
    padding: 18,
    background: "#fff",
  },
  panel: {
    border: "1px solid #dce3ec",
    borderRadius: 10,
    padding: 24,
    marginTop: 20,
    maxWidth: 650,
  },
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: 14,
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    marginTop: 6,
    font: "inherit",
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 14,
  },
  activeButton: {
    padding: "9px 14px",
    background: "#315fc4",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "9px 14px",
    background: "#edf2f7",
    color: "#202938",
    border: "1px solid #dce3ec",
    borderRadius: 6,
    cursor: "pointer",
  },
  dangerButton: {
    padding: "9px 14px",
    background: "#b42318",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  success: { color: "#18794e" },
  error: { color: "#b42318" },
};
