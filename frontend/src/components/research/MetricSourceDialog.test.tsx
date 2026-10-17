import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { companies } from "@/lib/research/corpus";
import { buildMetricSource } from "@/lib/research/metric-source";
import { MetricSourceDialog } from "./MetricSourceDialog";

const savedMethods = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  for (const method of ["showModal", "close"]) {
    savedMethods.set(method, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, method));
  }
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) { this.removeAttribute("open"); },
  });
});

afterEach(cleanup);

afterAll(() => {
  for (const [method, descriptor] of savedMethods) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, method, descriptor);
    else delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>)[method];
  }
});

describe("MetricSourceDialog", () => {
  const pin = buildMetricSource(companies[0], { kind: "profit" })!;

  it("shows the exact reported inputs, app calculation, and original report link", () => {
    render(<MetricSourceDialog pin={pin} onClose={() => {}} />);

    expect(screen.getByRole("dialog", { name: "Profit per $100 of sales" })).toBeVisible();
    expect(screen.getByText("App calculation from reported inputs")).toBeVisible();
    expect(screen.getByText("$55.8 kept")).toBeVisible();
    expect(screen.getByRole("row", { name: /Net income 2025 72,880/ })).toBeVisible();
    expect(screen.getByRole("row", { name: /Annual revenue 2025 130,497/ })).toBeVisible();
    expect(screen.getByText("Transcribed reported figures, not the original document layout.", { exact: false })).toBeVisible();
    expect(screen.getByText(pin.source.report)).toBeVisible();
    const link = screen.getByRole("link", { name: "Open original annual report" });
    expect(link).toHaveAttribute("href", pin.source.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("calls onClose from the close button and a canceled dialog", () => {
    const onClose = vi.fn();
    render(<MetricSourceDialog pin={pin} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close metric source" }));
    const dialog = screen.getByRole("dialog", { name: pin.title });
    const cancel = new Event("cancel", { bubbles: false, cancelable: true });
    fireEvent(dialog, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
