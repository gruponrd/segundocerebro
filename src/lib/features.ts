// The new backend has no AI provider configured yet. Core calculations remain
// available independently of a hosted model.
export const aiAnalysisEnabled = import.meta.env.VITE_AI_ANALYSIS_ENABLED !== "false";
