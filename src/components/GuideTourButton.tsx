"use client";

import { Map } from "lucide-react";
import { startTour } from "./Tour";

export function GuideTourButton() {
  return <button className="btn-primary" onClick={() => startTour("welcome")}><Map size={14} />Take the tour</button>;
}
