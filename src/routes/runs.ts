import { Router } from "express";
import { supabase } from "../lib/supabaseClient";

export const runsRouter = Router();

runsRouter.get("/runs", async (req, res) => {
  const limit = Number(req.query.limit) || 20;

  const { data, error } = await supabase
    .from("pipeline_runs")
    .select()
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json(data);
});

runsRouter.get("/runs/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select()
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "run not found" });
    return;
  }

  res.status(200).json(data);
});
