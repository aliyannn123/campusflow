import { test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { AuthContext } from "../src/features/auth/useAuth.js";
import ProtectedRoute from "../src/features/auth/ProtectedRoute.jsx";
import ContentForm from "../src/components/ContentForm.jsx";
test("pending faculty is redirected away from protected campus content", async () => {
  render(<AuthContext.Provider value={{ user: { accountStatus: "PENDING_APPROVAL", onboardingCompleted: true }, loading: false }}><MemoryRouter initialEntries={["/home"]}><Routes><Route element={<ProtectedRoute active />}><Route path="/home" element={<p>Private content</p>} /></Route><Route path="/pending-approval" element={<p>Awaiting approval</p>} /></Routes></MemoryRouter></AuthContext.Provider>);
  expect(await screen.findByText("Awaiting approval")).toBeTruthy();
  expect(screen.queryByText("Private content")).toBeNull();
});
test("an account loading failure gives a retry instead of showing private content", () => {
  render(<AuthContext.Provider value={{ loading: false, error: "Service unavailable" }}><MemoryRouter><ProtectedRoute /></MemoryRouter></AuthContext.Provider>);
  expect(screen.getByRole("alert").textContent).toContain("Service unavailable");
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
});
test("content forms preserve zero, booleans, and multiple audience selections", async () => {
  const onSubmit = vi.fn(async () => {});
  render(<ContentForm fields={[{ name: "backlogs", label: "Backlogs", type: "number" }, { name: "enabled", label: "Enabled", type: "checkbox", optional: true }, { name: "years", label: "Years", options: [["1", "First"], ["2", "Second"]], multiple: true }]} initial={{ backlogs: 0, enabled: true, years: ["1"] }} onSubmit={onSubmit} />);
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("Years"), ["1", "2"]);
  await user.click(screen.getByRole("button", { name: "Publish" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ backlogs: "0", enabled: true, years: ["1", "2"] }));
});
test("failed submissions retain entered content and report the error", async () => {
  render(<ContentForm fields={[{ name: "title", label: "Title" }]} onSubmit={async () => { throw new Error("Cannot publish"); }} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Title"), "Important notice");
  await user.click(screen.getByRole("button", { name: "Publish" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Cannot publish");
  expect(screen.getByLabelText("Title").value).toBe("Important notice");
});
