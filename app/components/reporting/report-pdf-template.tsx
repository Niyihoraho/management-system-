"use client";

import React from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PhotoItem = { src: string; caption: string };
export type PhotoSection = { countLabel: string; items: PhotoItem[] };

export type Activity = {
    name: string;
    submitterName: string;
    submitterEmail: string;
    submitterRegion: string;
    beneficiaries: string;
    participants: string;
    date: string;
    facilitators: string;
    followUp: string;
    impact?: string;
    impactText: string;
    photos?: PhotoSection;
};

export type EvaluationQuestion = {
    statement: string;
    ratingClass: string;
    labelClass: string;
    ratingLabel: string;
};

export type Evaluation = {
    title: string;
    description: string;
    legend: { label: string; color: string }[];
    questions: EvaluationQuestion[];
};

export type PillarData = {
    id: number;
    number: string;
    tagColor: string;
    tagLabel: string;
    title: string;
    subtitle: string;
    vision: string;
    sections: { label: string; activities: Activity[] }[];
    evaluation: Evaluation | null;
    isLast: boolean;
};

export type ReportData = {
    organizationBadge: string;
    reportTitle: string;
    reportTheme: string;
    reportSubtitle: string;
    coverStatement: string;
    generatedAt: string;
    pillars: PillarData[];
    totalActivities: number;
    footerLineOne: string;
    footerLineTwo: string;
};

/* ------------------------------------------------------------------ */
/*  Color palette – subdued corporate tones                           */
/* ------------------------------------------------------------------ */

const C = {
    navy: "#1a2744",
    gold: "#8b7a3e",
    cream: "#ffffff",
    pageBg: "#f9f9fb",
    textPrimary: "#1c1c28",
    textSecondary: "#4a4a5c",
    textMuted: "#7a7a8c",
    border: "#dfe1e6",
    borderLight: "#ecedf0",
    white: "#ffffff",
    tableHeader: "#f4f5f7",
    accentBar: "#1a2744",
};

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const pageBase: React.CSSProperties = {
    padding: "20px 28px 18px",
    background: C.white,
    boxSizing: "border-box" as const,
    width: "100%",
    fontFamily: FONT,
};

/* ------------------------------------------------------------------ */
/*  Rating bar                                                        */
/* ------------------------------------------------------------------ */

const RATING_COLORS: Record<string, { filled: string; count: number }> = {
    "seg-na": { filled: "#bbb", count: 4 },
    "seg-ne": { filled: "#c0392b", count: 1 },
    "seg-bg": { filled: "#e67e22", count: 2 },
    "seg-gw": { filled: "#c5a832", count: 3 },
    "seg-mt": { filled: "#27ae60", count: 4 },
};

const LABEL_COLORS: Record<string, string> = {
    "r-na": "#999",
    "r-ne": "#c0392b",
    "r-bg": "#e67e22",
    "r-gw": "#c5a832",
    "r-mt": "#27ae60",
};

function RatingBar({ ratingClass, labelClass, ratingLabel }: { ratingClass: string; labelClass: string; ratingLabel: string }) {
    const config = RATING_COLORS[ratingClass] ?? { filled: "#bbb", count: 0 };
    const labelColor = LABEL_COLORS[labelClass] ?? "#999";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", gap: "4px" }}>
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        style={{
                            height: "7px",
                            flex: 1,
                            borderRadius: "3px",
                            background: i <= config.count ? config.filled : "#e8e8ec",
                        }}
                    />
                ))}
            </div>
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, color: labelColor }}>
                {ratingLabel}
            </span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  COVER PAGE — Clean corporate                                      */
/* ------------------------------------------------------------------ */

function CoverPage({ data }: { data: ReportData }) {
    return (
        <div
            data-pdf-page
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minHeight: "1123px",
                boxSizing: "border-box",
                background: C.navy,
                color: C.white,
                fontFamily: FONT,
            }}
        >
            {/* Top accent line */}
            <div style={{ width: "100%", height: "4px", background: C.gold }} />

            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 32px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img src="/logo2.jpg" alt="Logo" style={{ height: "34px", borderRadius: "2px" }} crossOrigin="anonymous" />
                    <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.15)" }} />
                    <img src="/ifeslogo.png" alt="Partner Logo" style={{ height: "28px" }} crossOrigin="anonymous" />
                </div>
                <div style={{
                    fontSize: "9px",
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 500,
                }}>
                    {data.organizationBadge}
                </div>
            </div>

            {/* Main content */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 32px",
            }}>
                {/* Thin rule */}
                <div style={{ width: "40px", height: "2px", background: C.gold, marginBottom: "20px" }} />

                {/* Title */}
                <h1 style={{
                    fontSize: "36px",
                    fontWeight: 700,
                    lineHeight: 1.15,
                    margin: "0 0 8px",
                    color: C.white,
                    letterSpacing: "-0.5px",
                }}>
                    {data.reportTitle}
                </h1>

                {/* Theme */}
                <h2 style={{
                    fontSize: "20px",
                    fontWeight: 400,
                    color: C.gold,
                    margin: "0 0 10px",
                    letterSpacing: "0.5px",
                }}>
                    {data.reportTheme}
                </h2>

                {/* Subtitle */}
                <p style={{
                    fontSize: "11px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    margin: "0 0 24px",
                    maxWidth: "480px",
                }}>
                    {data.reportSubtitle}
                </p>

                {/* Statement */}
                {data.coverStatement && (
                    <div style={{
                        borderLeft: `3px solid ${C.gold}`,
                        padding: "10px 16px",
                        maxWidth: "520px",
                        marginBottom: "24px",
                    }}>
                        <p style={{
                            fontSize: "12px",
                            fontStyle: "italic",
                            lineHeight: 1.6,
                            color: "rgba(255,255,255,0.7)",
                            margin: 0,
                        }}>
                            &ldquo;{data.coverStatement}&rdquo;
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom info strip */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
            }}>
                {[
                    { label: "Report Date", value: data.generatedAt },
                    { label: "Strategic Pillars", value: String(data.pillars.length) },
                    { label: "Total Activities", value: String(data.totalActivities) },
                ].map((item, i) => (
                    <div key={i} style={{
                        padding: "14px 32px",
                        borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}>
                        <span style={{
                            display: "block",
                            fontSize: "8px",
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.4)",
                            marginBottom: "3px",
                            fontWeight: 500,
                        }}>
                            {item.label}
                        </span>
                        <span style={{ fontSize: "15px", fontWeight: 600, color: C.white }}>
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Bottom accent */}
            <div style={{ width: "100%", height: "3px", background: C.gold }} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  TABLE-STYLE INFO ROW                                              */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: "flex",
            borderBottom: `1px solid ${C.borderLight}`,
            fontSize: "12.5px",
        }}>
            <div style={{
                width: "140px",
                padding: "6px 10px",
                background: C.tableHeader,
                fontWeight: 600,
                color: C.textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontSize: "10px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
            }}>
                {label}
            </div>
            <div style={{
                flex: 1,
                padding: "6px 10px",
                color: C.textPrimary,
                lineHeight: 1.5,
            }}>
                {value}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  ACTIVITY CARD — Clean, table-based layout                         */
/* ------------------------------------------------------------------ */

function ActivityCard({ activity, index }: { activity: Activity; index: number }) {
    return (
        <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: "4px",
            overflow: "hidden",
            background: C.white,
            marginBottom: "6px",
        }}>
            {/* Card header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                borderBottom: `1px solid ${C.border}`,
                background: C.navy,
                color: C.white,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.5)",
                    }}>
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <h4 style={{
                        fontSize: "13.5px",
                        fontWeight: 600,
                        margin: 0,
                        lineHeight: 1.3,
                        color: C.white,
                    }}>
                        {activity.name}
                    </h4>
                </div>
                <span style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 500,
                    flexShrink: 0,
                }}>
                    {activity.date}
                </span>
            </div>

            {/* Submitter line */}
            <div style={{
                padding: "5px 14px",
                fontSize: "10.5px",
                color: C.textMuted,
                borderBottom: `1px solid ${C.borderLight}`,
                background: C.tableHeader,
            }}>
                Submitted by <strong style={{ color: C.textPrimary }}>{activity.submitterName}</strong>
                <span style={{ margin: "0 8px", color: C.border }}>|</span>
                {activity.submitterRegion}
            </div>

            {/* Info table */}
            <div>
                <InfoRow label="Beneficiaries" value={activity.beneficiaries} />
                <InfoRow label="Participants" value={activity.participants} />
                <InfoRow label="Facilitators" value={activity.facilitators} />
                <InfoRow label="Follow-up" value={activity.followUp} />
            </div>

            {/* Impact section */}
            <div style={{
                padding: "8px 14px",
                borderTop: `1px solid ${C.border}`,
                borderBottom: activity.photos ? `1px solid ${C.border}` : "none",
            }}>
                <div style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 600,
                    color: C.textSecondary,
                    marginBottom: "4px",
                }}>
                    Impact Summary
                </div>
                <p style={{ fontSize: "11.5px", lineHeight: 1.5, color: C.textPrimary, margin: 0 }}>
                    {activity.impactText}
                </p>
            </div>

            {/* Photo evidence */}
            {activity.photos && (
                <div style={{ padding: "10px 14px", background: C.pageBg }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                    }}>
                        <span style={{
                            fontSize: "10px",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            fontWeight: 600,
                            color: C.textSecondary,
                        }}>
                            Photo Evidence
                        </span>
                        <span style={{
                            fontSize: "10px",
                            color: C.textMuted,
                            fontWeight: 500,
                        }}>
                            {activity.photos.countLabel}
                        </span>
                    </div>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: activity.photos.items.length === 1 ? "1fr" : "1fr 1fr",
                        gap: "8px",
                    }}>
                        {activity.photos.items.map((item, i) => (
                            <div key={i} style={{
                                overflow: "hidden",
                                borderRadius: "3px",
                                border: `1px solid ${C.border}`,
                            }}>
                                <div style={{
                                    width: "100%",
                                    height: activity.photos!.items.length === 1 ? "260px" : "170px",
                                    overflow: "hidden",
                                    background: "#f0f0f2",
                                }}>
                                    <img
                                        src={item.src}
                                        alt={item.caption}
                                        crossOrigin="anonymous"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                </div>
                                <div style={{
                                    padding: "4px 8px",
                                    fontSize: "10px",
                                    color: C.textMuted,
                                    textAlign: "center",
                                    background: C.white,
                                    borderTop: `1px solid ${C.borderLight}`,
                                }}>
                                    {item.caption}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  PILLAR SECTION                                                    */
/* ------------------------------------------------------------------ */

function PillarSection({ pillar }: { pillar: PillarData }) {
    return (
        <>
            {/* Single page: Pillar header + vision + all activities */}
            <div data-pdf-page style={pageBase}>
                {/* Pillar header */}
                <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "10px",
                    paddingBottom: "8px",
                    borderBottom: `1px solid ${C.border}`,
                }}>
                    {/* Pillar number */}
                    <div style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "4px",
                        background: C.navy,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: C.white }}>
                            {pillar.number}
                        </span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: "9px",
                            letterSpacing: "2px",
                            textTransform: "uppercase",
                            color: C.textMuted,
                            fontWeight: 600,
                            marginBottom: "4px",
                        }}>
                            Strategic Pillar
                        </div>
                        <h2 style={{
                            fontSize: "19px",
                            fontWeight: 700,
                            color: C.textPrimary,
                            margin: "0 0 2px",
                            lineHeight: 1.25,
                        }}>
                            {pillar.title}
                        </h2>
                        <p style={{ fontSize: "11.5px", color: C.textMuted, margin: 0, lineHeight: 1.4 }}>
                            {pillar.subtitle}
                        </p>
                    </div>
                </div>

                {/* Vision statement */}
                <div style={{
                    background: C.pageBg,
                    color: C.textPrimary,
                    padding: "8px 14px",
                    borderRadius: "3px",
                    borderLeft: `3px solid ${C.navy}`,
                    fontSize: "11.5px",
                    lineHeight: 1.55,
                    fontStyle: "italic",
                    marginBottom: "10px",
                }}>
                    <span style={{
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "1.5px",
                        color: C.textSecondary,
                        fontWeight: 600,
                        fontStyle: "normal",
                        display: "block",
                        marginBottom: "4px",
                    }}>
                        Vision
                    </span>
                    {pillar.vision}
                </div>

                {/* All activities inline */}
                {pillar.sections.map((section, sIdx) => (
                    <div key={sIdx}>
                        {/* Section label */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "5px",
                            marginTop: sIdx > 0 ? "6px" : "0",
                        }}>
                            <span style={{
                                fontSize: "10.5px",
                                letterSpacing: "1.5px",
                                textTransform: "uppercase",
                                fontWeight: 600,
                                color: C.textSecondary,
                            }}>
                                {section.label}
                            </span>
                            <span style={{
                                fontSize: "10.5px",
                                color: C.textMuted,
                                fontWeight: 500,
                            }}>
                                ({section.activities.length} {section.activities.length === 1 ? "activity" : "activities"})
                            </span>
                            <span style={{ flex: 1, height: "1px", background: C.border }} />
                        </div>

                        {/* Activity cards */}
                        {section.activities.map((act, aIdx) => (
                            <ActivityCard key={aIdx} activity={act} index={aIdx} />
                        ))}
                    </div>
                ))}

                {/* Evaluation – inline, inside same page */}
                {pillar.evaluation && (
                    <div style={{ marginTop: "10px" }}>
                        <div style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: "4px",
                            overflow: "hidden",
                        }}>
                            {/* Eval header */}
                            <div style={{
                                padding: "10px 14px",
                                borderBottom: `1px solid ${C.border}`,
                                background: C.tableHeader,
                            }}>
                                <h3 style={{
                                    fontSize: "14.5px",
                                    fontWeight: 700,
                                    color: C.textPrimary,
                                    margin: "0 0 2px",
                                }}>
                                    {pillar.evaluation.title}
                                </h3>
                                <p style={{ fontSize: "11.5px", color: C.textMuted, margin: 0, lineHeight: 1.45 }}>
                                    {pillar.evaluation.description}
                                </p>
                            </div>

                            {/* Legend */}
                            <div style={{
                                display: "flex",
                                gap: "12px",
                                padding: "8px 14px",
                                borderBottom: `1px solid ${C.border}`,
                                background: C.white,
                            }}>
                                {pillar.evaluation.legend.map((item, i) => (
                                    <div key={i} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "10px",
                                        color: C.textMuted,
                                    }}>
                                        <span style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "2px",
                                            background: item.color,
                                            flexShrink: 0,
                                        }} />
                                        {item.label}
                                    </div>
                                ))}
                            </div>

                            {/* Questions */}
                            <div>
                                {pillar.evaluation.questions.map((q, i) => (
                                    <div key={i} style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 160px",
                                        gap: "10px",
                                        alignItems: "center",
                                        padding: "8px 14px",
                                        borderBottom: i < pillar.evaluation!.questions.length - 1 ? `1px solid ${C.borderLight}` : "none",
                                        background: i % 2 === 0 ? C.white : C.pageBg,
                                    }}>
                                        <div style={{ fontSize: "11.5px", lineHeight: 1.4, color: C.textPrimary }}>{q.statement}</div>
                                        <RatingBar ratingClass={q.ratingClass} labelClass={q.labelClass} ratingLabel={q.ratingLabel} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  MAIN EXPORT COMPONENT                                             */
/* ------------------------------------------------------------------ */

interface ReportPdfTemplateProps {
    data: ReportData;
}

const ReportPdfTemplate = React.forwardRef<HTMLDivElement, ReportPdfTemplateProps>(
    ({ data }, ref) => {
        return (
            <div
                ref={ref}
                style={{
                    width: "794px",
                    fontFamily: FONT,
                    background: C.white,
                    color: C.textPrimary,
                    lineHeight: 1.5,
                }}
            >
                {/* System fonts – no external dependency needed for Segoe UI / Helvetica */}

                <CoverPage data={data} />

                {data.pillars.map((pillar) => (
                    <PillarSection key={pillar.id} pillar={pillar as PillarData} />
                ))}
            </div>
        );
    }
);

ReportPdfTemplate.displayName = "ReportPdfTemplate";

export default ReportPdfTemplate;
