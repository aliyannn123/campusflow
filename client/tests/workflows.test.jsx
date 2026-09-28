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

import { beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConfirmation } from "../src/components/useConfirmation.jsx";
import RemoteSelect from "../src/components/RemoteSelect.jsx";
import VerifyEmailPage from "../src/pages/VerifyEmailPage.jsx";
import { api } from "../src/lib/apiClient.js";
vi.mock("../src/lib/apiClient.js", () => ({ api: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function() { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function() { this.removeAttribute("open"); };
});
test("cancel prevents a consequential action; explicit confirmation executes it once", async () => {
  const save = vi.fn();
  function Example() {
    const { confirm, dialog } = useConfirmation();
    return <>{dialog}<button onClick={async () => { if (await confirm("Suspend student", "The student will lose access.")) save(); }}>Suspend</button></>;
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Suspend", exact: true }));
  expect(screen.getByRole("dialog", { name: "Suspend student" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Suspend", exact: true }));
  await user.click(screen.getByRole("button", { name: "Confirm" }));
  expect(save).toHaveBeenCalledTimes(1);
});
test("reference search preserves a previously selected record across pages", async () => {
  api.mockImplementation(async path => {
    const params = new URL(path, "http://localhost").searchParams;
    if (params.has("ids")) return { data: [{ _id: "old", name: "Older department" }] };
    return { data: params.get("page") === "2" ? [{ _id: "next", name: "Next department" }] : [{ _id: "new", name: "Recent department" }], pagination: { pages: 2 } };
  });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RemoteSelect field={{ name: "department", label: "Department", remote: "/admin/departments" }} initial="old" /></QueryClientProvider>);
  await screen.findByRole("option", { name: "Older department" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "More choices" }));
  await screen.findByRole("option", { name: "Next department" });
  expect(screen.getByLabelText("Department").value).toBe("old");
  await user.type(screen.getByLabelText("Find department"), "Computer");
  await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes("q=Computer"))).toBe(true));
});
test("failed registration email delivery displays a resend recovery path", async () => {
  render(<AuthContext.Provider value={{ acceptSession: vi.fn() }}><MemoryRouter initialEntries={[{ pathname: "/verify-email", search: "?email=student%40college.ac.in", state: { emailSent: false } }]}><VerifyEmailPage /></MemoryRouter></AuthContext.Provider>);
  expect(screen.getByText(/could not send the verification email/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Resend code" }).disabled).toBe(false);
});
