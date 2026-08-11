import test from "node:test"
import assert from "node:assert/strict"

import {
  buildApiUrl,
  buildApiUrlFromBase,
  getApiBaseUrl,
  resolveApiBaseUrl,
} from "./api.ts"

test("preferred API base URL takes priority over the legacy variable", () => {
  assert.equal(
    resolveApiBaseUrl({
      baseUrl: "https://preferred.example.test/api",
      legacyUrl: "https://legacy.example.test",
      nodeEnv: "production",
    }),
    "https://preferred.example.test"
  )
})

test("legacy NEXT_PUBLIC_API_URL remains supported", () => {
  assert.equal(
    resolveApiBaseUrl({
      legacyUrl: "https://legacy.example.test/api/",
      nodeEnv: "production",
    }),
    "https://legacy.example.test"
  )
})

test("production rejects missing configuration", () => {
  assert.throws(
    () => resolveApiBaseUrl({ nodeEnv: "production" }),
    /is required for production/
  )
})

test("production rejects known placeholder configuration", () => {
  for (const placeholder of [
    "https://YOUR_BACKEND_URL.onrender.com",
    "https://your-backend.example.com",
    "YOUR_BACKEND_URL",
    "https://replace-me.invalid",
    "https://placeholder.invalid",
    "https://api.example.com",
  ]) {
    assert.throws(
      () => resolveApiBaseUrl({ baseUrl: placeholder, nodeEnv: "production" }),
      /placeholder|valid absolute/
    )
  }
})

test("development uses localhost only when neither variable is configured", () => {
  assert.equal(
    resolveApiBaseUrl({ nodeEnv: "development" }),
    "http://localhost:5000"
  )
})

test("production accepts a valid configured URL and normalizes trailing slash and api suffix", () => {
  assert.equal(
    resolveApiBaseUrl({
      baseUrl: " https://backend.example.test/api/// ",
      nodeEnv: "production",
    }),
    "https://backend.example.test"
  )
})

test("invalid URL protocols and relative URLs are rejected", () => {
  assert.throws(
    () =>
      resolveApiBaseUrl({
        baseUrl: "ftp://backend.example.test",
        nodeEnv: "production",
      }),
    /HTTP or HTTPS protocol/
  )
  assert.throws(
    () =>
      resolveApiBaseUrl({
        baseUrl: "/api",
        nodeEnv: "production",
      }),
    /valid absolute/
  )
})

test("resolution stays lazy until a URL is requested", () => {
  assert.equal(typeof getApiBaseUrl, "function")
  assert.equal(typeof buildApiUrl, "function")
  assert.throws(
    () => getApiBaseUrl({ nodeEnv: "production" }),
    /is required for production/
  )
  assert.throws(
    () => buildApiUrl("/auth/login", { nodeEnv: "production" }),
    /is required for production/
  )
})

test("login, Google login, password reset, and standard requests share one URL builder", () => {
  const baseUrl = "https://backend.example.test"
  const environment = { baseUrl, nodeEnv: "production" }
  assert.equal(
    buildApiUrl("/auth/login", environment),
    `${baseUrl}/api/auth/login`
  )
  assert.equal(
    buildApiUrl("/auth/google", environment),
    `${baseUrl}/api/auth/google`
  )
  assert.equal(
    buildApiUrl("/auth/forgot-password", environment),
    `${baseUrl}/api/auth/forgot-password`
  )
  assert.equal(
    buildApiUrl("/auth/reset-password", environment),
    `${baseUrl}/api/auth/reset-password`
  )
  assert.equal(
    buildApiUrl("/api/health", environment),
    `${baseUrl}/api/health`
  )
  assert.equal(
    buildApiUrlFromBase(baseUrl, "operations/status"),
    `${baseUrl}/api/operations/status`
  )
})
