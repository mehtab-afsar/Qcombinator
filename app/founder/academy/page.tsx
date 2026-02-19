"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Calendar, Users, Clock, Star,
  Award, ArrowRight, Video, Play, CheckCircle,
  ChevronRight, Sparkles, BookOpen, Zap,
} from "lucide-react";
import {
  getUpcomingWorkshops, getPastWorkshops, mentors,
  academyPrograms, getOpenPrograms,
} from "@/features/academy/data/workshops";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";

const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  "go-to-market": { bg: "#EEF2FF", text: "#3730A3" },
  product:        { bg: "#F0FDF4", text: "#166534" },
  fundraising:    { bg: "#FFF7ED", text: "#9A3412" },
  team:           { bg: "#FDF4FF", text: "#6B21A8" },
  sales:          { bg: "#FFF1F2", text: "#9F1239" },
  operations:     { bg: "#F0FDFA", text: "#134E4A" },
};

const TABS = [
  { key: "workshops", label: "Workshops", icon: Zap },
  { key: "mentors",   label: "Mentors",   icon: Users },
  { key: "programs",  label: "Programs",  icon: BookOpen },
];

export default function Academy() {
  const [tab, setTab]               = useState("workshops");
  const [toast, setToast]           = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const upcomingWorkshops = getUpcomingWorkshops();
  const pastWorkshops     = getPastWorkshops();
  const openPrograms      = getOpenPrograms();

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2800);
  };

  return (
    <div style={{ background: bg, minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36 }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>
                Academy
              </p>
              <h1 style={{ fontSize: 32, fontWeight: 300, color: ink, lineHeight: 1.1, marginBottom: 8 }}>
                Learn. Connect. Grow.
              </h1>
              <p style={{ fontSize: 15, fontWeight: 300, color: muted, maxWidth: 420 }}>
                Live workshops, expert mentors, and cohort programs designed for founders at your stage.
              </p>
            </div>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 99,
                background: "#EEF2FF", border: "1px solid #C7D2FE",
                fontSize: 12, fontWeight: 500, color: "#3730A3",
              }}
            >
              <span style={{ height: 6, width: 6, borderRadius: "50%", background: "#6366F1", display: "inline-block" }} />
              New workshops added weekly
            </div>
          </div>
        </motion.div>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          style={{
            display: "flex", gap: 4, marginBottom: 32,
            background: surf, borderRadius: 12, padding: 4,
            border: `1px solid ${bdr}`, width: "fit-content",
          }}
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  background: active ? bg : "transparent",
                  color: active ? ink : muted,
                  boxShadow: active ? "0 1px 4px rgba(24,22,15,0.08)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {label}
              </button>
            );
          })}
        </motion.div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >

            {/* ── WORKSHOPS ─────────────────────────────────────────── */}
            {tab === "workshops" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

                {/* Upcoming */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 500, color: ink }}>Upcoming Workshops</h2>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99,
                      background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>
                      {upcomingWorkshops.length} live
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 16 }}>
                    {upcomingWorkshops.map((w, i) => {
                      const topicStyle = TOPIC_COLORS[w.topic] ?? { bg: surf, text: muted };
                      const pct = Math.round((w.registered / w.capacity) * 100);
                      return (
                        <motion.div
                          key={w.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          onMouseEnter={() => setHoveredCard(w.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          style={{
                            background: bg, border: `1px solid ${hoveredCard === w.id ? "#C8C3BB" : bdr}`,
                            borderRadius: 16, padding: 24,
                            boxShadow: hoveredCard === w.id ? "0 8px 28px rgba(24,22,15,0.09)" : "none",
                            transition: "all 0.18s", cursor: "default",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
                              textTransform: "uppercase", padding: "3px 10px", borderRadius: 99,
                              background: topicStyle.bg, color: topicStyle.text,
                            }}>
                              {w.topic.replace("-", " ")}
                            </span>
                            <span style={{
                              fontSize: 12, fontWeight: 400, color: muted,
                              background: surf, padding: "3px 10px", borderRadius: 99,
                              border: `1px solid ${bdr}`,
                            }}>
                              {w.spotsLeft} spots left
                            </span>
                          </div>

                          <h3 style={{ fontSize: 17, fontWeight: 400, color: ink, marginBottom: 8, lineHeight: 1.3 }}>
                            {w.title}
                          </h3>
                          <p style={{ fontSize: 13, fontWeight: 300, color: muted, lineHeight: 1.6, marginBottom: 18 }}>
                            {w.description}
                          </p>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                            {[
                              { icon: Calendar, text: `${new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${w.time}` },
                              { icon: Clock,    text: w.duration },
                              { icon: Users,    text: `${w.instructor} · ${w.instructorTitle}` },
                            ].map(({ icon: Icon, text }) => (
                              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 300, color: muted }}>
                                <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                                {text}
                              </div>
                            ))}
                          </div>

                          {/* Capacity bar */}
                          <div style={{ marginBottom: 18 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: muted, fontWeight: 300 }}>{w.registered} registered</span>
                              <span style={{ fontSize: 11, color: muted, fontWeight: 300 }}>{pct}% full</span>
                            </div>
                            <div style={{ height: 3, background: bdr, borderRadius: 99, overflow: "hidden" }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, delay: i * 0.06 + 0.3 }}
                                style={{ height: "100%", borderRadius: 99, background: pct > 80 ? "#DC2626" : ink }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={showToast}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                              gap: 8, padding: "11px 0", borderRadius: 10, border: "none",
                              background: ink, color: bg, fontSize: 13, fontWeight: 500,
                              cursor: "pointer", transition: "opacity 0.15s",
                            }}
                          >
                            Reserve My Spot
                            <ArrowRight style={{ width: 14, height: 14 }} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Past / Recordings */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 500, color: ink }}>Watch Recordings</h2>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99,
                      background: surf, color: muted, border: `1px solid ${bdr}`,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>
                      {pastWorkshops.length} available
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 16 }}>
                    {pastWorkshops.map((w, i) => {
                      const topicStyle = TOPIC_COLORS[w.topic] ?? { bg: surf, text: muted };
                      return (
                        <motion.div
                          key={w.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 + 0.1 }}
                          onMouseEnter={() => setHoveredCard(`past-${w.id}`)}
                          onMouseLeave={() => setHoveredCard(null)}
                          style={{
                            background: bg, border: `1px solid ${hoveredCard === `past-${w.id}` ? "#C8C3BB" : bdr}`,
                            borderRadius: 16, padding: 24, opacity: 0.88,
                            boxShadow: hoveredCard === `past-${w.id}` ? "0 8px 28px rgba(24,22,15,0.09)" : "none",
                            transition: "all 0.18s", cursor: "default",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
                              textTransform: "uppercase", padding: "3px 10px", borderRadius: 99,
                              background: topicStyle.bg, color: topicStyle.text,
                            }}>
                              {w.topic.replace("-", " ")}
                            </span>
                            <div style={{
                              display: "flex", alignItems: "center", gap: 5,
                              fontSize: 11, color: muted, background: surf,
                              padding: "3px 10px", borderRadius: 99, border: `1px solid ${bdr}`,
                            }}>
                              <Video style={{ width: 11, height: 11 }} />
                              Recording
                            </div>
                          </div>

                          <h3 style={{ fontSize: 17, fontWeight: 400, color: ink, marginBottom: 8, lineHeight: 1.3 }}>
                            {w.title}
                          </h3>
                          <p style={{ fontSize: 13, fontWeight: 300, color: muted, lineHeight: 1.6, marginBottom: 16 }}>
                            {w.description}
                          </p>

                          <div style={{ display: "flex", gap: 16, marginBottom: 18, fontSize: 12, color: muted, fontWeight: 300 }}>
                            <span>{new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span>·</span>
                            <span>{w.instructor}</span>
                          </div>

                          <button
                            onClick={showToast}
                            onMouseEnter={e => (e.currentTarget.style.background = surf)}
                            onMouseLeave={e => (e.currentTarget.style.background = bg)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                              gap: 8, padding: "10px 0", borderRadius: 10,
                              border: `1px solid ${bdr}`, background: bg,
                              color: ink, fontSize: 13, fontWeight: 400,
                              cursor: "pointer", transition: "background 0.15s",
                            }}
                          >
                            <Play style={{ width: 13, height: 13 }} />
                            Watch Recording
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── MENTORS ───────────────────────────────────────────── */}
            {tab === "mentors" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {mentors.map((mentor, i) => {
                  const initials = mentor.name.split(" ").map((n: string) => n[0]).join("");
                  const colors = ["#C2B89A", "#A8A090", "#8A9BB5", "#9BB5A0", "#B5A09B"];
                  const avatarBg = colors[i % colors.length];
                  return (
                    <motion.div
                      key={mentor.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onMouseEnter={() => setHoveredCard(mentor.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: bg, border: `1px solid ${hoveredCard === mentor.id ? "#C8C3BB" : bdr}`,
                        borderRadius: 16, padding: 24,
                        boxShadow: hoveredCard === mentor.id ? "0 8px 28px rgba(24,22,15,0.09)" : "none",
                        transition: "all 0.18s",
                      }}
                    >
                      {/* Avatar */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
                        <div style={{
                          height: 72, width: 72, borderRadius: "50%",
                          background: avatarBg, display: "flex", alignItems: "center",
                          justifyContent: "center", marginBottom: 12,
                          fontSize: 20, fontWeight: 500, color: bg,
                        }}>
                          {initials}
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 500, color: ink, marginBottom: 3 }}>{mentor.name}</h3>
                        <p style={{ fontSize: 12, fontWeight: 300, color: muted }}>{mentor.title}</p>
                        <p style={{ fontSize: 11, fontWeight: 300, color: "#B5B0A8" }}>{mentor.company}</p>
                      </div>

                      {/* Stats row */}
                      <div style={{
                        display: "flex", justifyContent: "center", gap: 24,
                        padding: "12px 0", borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}`,
                        marginBottom: 16,
                      }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginBottom: 2 }}>
                            <Star style={{ width: 12, height: 12, color: "#D97706" }} />
                            <span style={{ fontSize: 14, fontWeight: 500, color: ink }}>{mentor.rating}</span>
                          </div>
                          <p style={{ fontSize: 10, color: muted, fontWeight: 300 }}>Rating</p>
                        </div>
                        <div style={{ width: 1, background: bdr }} />
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 2 }}>{mentor.sessionsCompleted}</p>
                          <p style={{ fontSize: 10, color: muted, fontWeight: 300 }}>Sessions</p>
                        </div>
                      </div>

                      {/* Expertise chips */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                        {mentor.expertise.map((skill: string) => (
                          <span key={skill} style={{
                            fontSize: 11, fontWeight: 400, color: muted,
                            padding: "3px 10px", borderRadius: 99,
                            background: surf, border: `1px solid ${bdr}`,
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>

                      <p style={{ fontSize: 13, fontWeight: 300, color: muted, lineHeight: 1.6, marginBottom: 16 }}>
                        {mentor.bio}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18, fontSize: 12, color: muted, fontWeight: 300 }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        {mentor.availability}
                      </div>

                      <button
                        onClick={showToast}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        style={{
                          width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                          background: ink, color: bg, fontSize: 13, fontWeight: 500,
                          cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 7, transition: "opacity 0.15s",
                        }}
                      >
                        Book 1:1 Session
                        <ArrowRight style={{ width: 14, height: 14 }} />
                      </button>
                    </motion.div>
                  );
                })}

                {/* Coming soon card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: mentors.length * 0.06 }}
                  style={{
                    background: surf, border: `2px dashed ${bdr}`,
                    borderRadius: 16, padding: 24,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    textAlign: "center", minHeight: 300,
                  }}
                >
                  <Sparkles style={{ width: 32, height: 32, color: "#C8C3BB", marginBottom: 12 }} />
                  <h3 style={{ fontSize: 15, fontWeight: 500, color: ink, marginBottom: 6 }}>More coming soon</h3>
                  <p style={{ fontSize: 13, fontWeight: 300, color: muted }}>New expert mentors added every week</p>
                </motion.div>
              </div>
            )}

            {/* ── PROGRAMS ──────────────────────────────────────────── */}
            {tab === "programs" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {openPrograms.map((prog, i) => {
                  const pct = Math.round(((prog.cohortSize - prog.spotsLeft) / prog.cohortSize) * 100);
                  return (
                    <motion.div
                      key={prog.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onMouseEnter={() => setHoveredCard(prog.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: bg, border: `1px solid ${hoveredCard === prog.id ? "#C8C3BB" : bdr}`,
                        borderRadius: 16, padding: 28,
                        boxShadow: hoveredCard === prog.id ? "0 8px 28px rgba(24,22,15,0.09)" : "none",
                        transition: "all 0.18s",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <h3 style={{ fontSize: 19, fontWeight: 400, color: ink }}>{prog.name}</h3>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                              background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0",
                              letterSpacing: "0.08em", textTransform: "uppercase",
                            }}>
                              Open
                            </span>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 300, color: muted, marginBottom: 4 }}>
                            {prog.duration} · Cohort-based
                          </p>
                          <p style={{ fontSize: 14, fontWeight: 300, color: muted, lineHeight: 1.6, marginBottom: 18, maxWidth: 560 }}>
                            {prog.description}
                          </p>

                          {/* Curriculum pills */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                            {prog.curriculum.map((module: string, idx: number) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <CheckCircle style={{ width: 11, height: 11, color: "#8A867C" }} />
                                <span style={{ fontSize: 12, fontWeight: 300, color: muted }}>{module}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right sidebar */}
                        <div style={{
                          minWidth: 200, background: surf, borderRadius: 12, padding: 20,
                          border: `1px solid ${bdr}`,
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                            {[
                              { label: "Starts", value: new Date(prog.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
                              { label: "Cohort", value: `${prog.cohortSize} founders` },
                              { label: "Min Q-Score", value: prog.requirements.minQScore },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <p style={{ fontSize: 10, fontWeight: 600, color: "#B5B0A8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
                                <p style={{ fontSize: 14, fontWeight: 400, color: ink }}>{value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Spots bar */}
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontSize: 10, color: muted, fontWeight: 300 }}>{prog.spotsLeft} spots left</span>
                              <span style={{ fontSize: 10, color: muted, fontWeight: 300 }}>{pct}% filled</span>
                            </div>
                            <div style={{ height: 3, background: bdr, borderRadius: 99 }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.07 + 0.4 }}
                                style={{ height: "100%", borderRadius: 99, background: pct > 80 ? "#DC2626" : ink }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={showToast}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                            style={{
                              width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                              background: ink, color: bg, fontSize: 13, fontWeight: 500,
                              cursor: "pointer", display: "flex", alignItems: "center",
                              justifyContent: "center", gap: 7, transition: "opacity 0.15s",
                            }}
                          >
                            Apply Now
                            <Award style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Closed programs */}
                {academyPrograms.filter(p => p.status === "closed").map((prog, i) => (
                  <motion.div
                    key={prog.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (openPrograms.length + i) * 0.06 }}
                    style={{
                      background: surf, border: `1px solid ${bdr}`,
                      borderRadius: 16, padding: 28, opacity: 0.6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <h3 style={{ fontSize: 19, fontWeight: 400, color: ink }}>{prog.name}</h3>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                        background: surf, color: muted, border: `1px solid ${bdr}`,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                      }}>
                        Applications Closed
                      </span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 300, color: muted }}>{prog.duration} · Cohort-based</p>
                    <p style={{ fontSize: 14, fontWeight: 300, color: muted, marginTop: 8 }}>{prog.description}</p>
                  </motion.div>
                ))}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
              background: ink, color: bg, borderRadius: 12,
              padding: "14px 22px", display: "flex", alignItems: "center", gap: 10,
              fontSize: 14, fontWeight: 400, zIndex: 100,
              boxShadow: "0 16px 48px rgba(24,22,15,0.2)",
            }}
          >
            <Sparkles style={{ width: 16, height: 16 }} />
            Coming soon — we&apos;ll notify you when registration opens!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
