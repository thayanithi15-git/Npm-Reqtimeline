#!/usr/bin/env node

import { globalMetrics } from "../metrics/aggregator";
import { renderDashboard } from "./dashboard";

const command = process.argv[2];

if (command === "dashboard" || command === "live" || !command) {
  const metrics = globalMetrics.getMetrics();
  const fingerprints = globalMetrics.fingerprints.getFingerprints();

  console.log(renderDashboard(metrics, fingerprints));
} else {
  console.log(`reqtimeline CLI

Usage:
  npx reqtimeline dashboard    Show live performance metrics and slowest routes
`);
}
