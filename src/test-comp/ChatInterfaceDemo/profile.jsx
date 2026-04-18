import React, { useEffect, useState } from "react";
import {
    getAboutMe,
    getInstructions,
    createInstruction,
    updateSpecificInstruction,
} from "../../profile/profile";

const Profile = ({ onClose }) => {
    const [aboutMe, setAboutMe] = useState("");
    const [aboutMeLoading, setAboutMeLoading] = useState(false);
    const [aboutMeError, setAboutMeError] = useState("");

    const [customInstruction, setCustomInstruction] = useState("");
    const [instructionId, setInstructionId] = useState(null);
    const [savingInstruction, setSavingInstruction] = useState(false);
    const [instructionError, setInstructionError] = useState("");
    const [instructionStatus, setInstructionStatus] = useState("");

    useEffect(() => {
        loadAboutMe();
        loadExistingInstruction();
    }, []);

    const loadAboutMe = async () => {
        setAboutMeLoading(true);
        setAboutMeError("");
        const res = await getAboutMe();
        setAboutMeLoading(false);
        if (res?.status === "success") {
            setAboutMe(res?.data?.summary || "");
        } else {
            setAboutMeError(res?.error?.message || "Failed to fetch about me");
        }
    };

    const loadExistingInstruction = async () => {
        const res = await getInstructions({ scope: "global" });
        if (res?.status !== "success" || !res?.data) return;

        const instructions = res.data.instructions;
        if (!Array.isArray(instructions)) return;

        if (instructions.length > 0) {
            const first = instructions[0];
            setCustomInstruction(first?.instruction ?? "");
            setInstructionId(first?.instructionId);
        }
        // instructions.length === 0 → leave textarea empty, no instructionId → first save uses createInstruction
    };

    const handleSaveInstruction = async () => {
        setInstructionError("");
        setInstructionStatus("");

        if (!customInstruction?.trim()) {
            setInstructionError("Instruction is required");
            return;
        }

        setSavingInstruction(true);

        let res;
        if (!instructionId) {
            res = await createInstruction({
                instruction: customInstruction,
                scope: "global",
            });
            if (res?.status === "success") {
                const newId = res?.data?.id || res?.data?._id || res?.data?.data?.id;
                if (newId) setInstructionId(newId);
                setInstructionStatus("Instruction created");
            }
        } else {
            res = await updateSpecificInstruction({
                instructionId,
                instruction: customInstruction,
            });
            if (res?.status === "success") {
                setInstructionStatus("Instruction updated");
            }
        }

        setSavingInstruction(false);

        if (res?.status !== "success") {
            setInstructionError(res?.error?.message || "Failed to save instruction");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={{ margin: 0 }}>Profile</h2>
                {onClose && (
                    <button type="button" onClick={onClose} style={styles.closeBtn}>
                        ← Back
                    </button>
                )}
            </div>

            <section style={styles.section}>
                <h3>About Me</h3>
                {aboutMeLoading && <div>Loading…</div>}
                {!aboutMeLoading && aboutMeError && (
                    <div style={styles.error}>{aboutMeError}</div>
                )}
                {!aboutMeLoading && !aboutMeError && (
                    <div style={styles.aboutMeBox}>
                        {aboutMe ? aboutMe : <em>No summary available</em>}
                    </div>
                )}
            </section>

            <section style={styles.section}>
                <h3>Custom Instructions</h3>
                <textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="Enter custom instruction"
                    rows={4}
                    style={styles.textarea}
                />
                <div style={styles.actionsRow}>
                    <button
                        type="button"
                        onClick={handleSaveInstruction}
                        disabled={savingInstruction}
                        style={styles.primaryBtn}
                    >
                        {savingInstruction
                            ? "Saving…"
                            : instructionId
                                ? "Update"
                                : "Save"}
                    </button>
                    {instructionStatus && (
                        <span style={styles.success}>{instructionStatus}</span>
                    )}
                    {instructionError && (
                        <span style={styles.error}>{instructionError}</span>
                    )}
                </div>
                <small style={{ color: "#666" }}>
                    {instructionId
                        ? `Instruction ID: ${instructionId}`
                        : "No instruction yet — first save will create one."}
                </small>
            </section>
        </div>
    );
};

const styles = {
    container: {
        padding: "16px",
        maxWidth: "720px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
    },
    closeBtn: {
        padding: "6px 12px",
        cursor: "pointer",
    },
    section: {
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        background: "#fff",
    },
    aboutMeBox: {
        padding: "12px",
        background: "#f7f7f8",
        borderRadius: "6px",
        whiteSpace: "pre-wrap",
        minHeight: "40px",
    },
    textarea: {
        width: "100%",
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        fontFamily: "inherit",
        fontSize: "14px",
        boxSizing: "border-box",
        resize: "vertical",
    },
    actionsRow: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginTop: "8px",
    },
    primaryBtn: {
        padding: "8px 16px",
        background: "#2f6feb",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
    },
    error: { color: "#c0392b" },
    success: { color: "#1f8a4c" },
};

export default Profile;
