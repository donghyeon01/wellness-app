import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";

const queryClient = new QueryClient();

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

vi.mock("@/api/todos", () => ({
  useTodos: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/api/events", () => ({
  useEvents: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/api/pomodoro", () => ({
  usePomodoroStats: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/api/diary", () => ({
  useDiaries: vi.fn(() => ({ data: [] })),
}));

import { useTodos } from "@/api/todos";
import { useEvents } from "@/api/events";
import { usePomodoroStats } from "@/api/pomodoro";
import { useDiaries } from "@/api/diary";

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
    vi.mocked(useTodos).mockReturnValue({ data: [] } as never);
    vi.mocked(useEvents).mockReturnValue({ data: [] } as never);
    vi.mocked(usePomodoroStats).mockReturnValue({ data: undefined } as never);
    vi.mocked(useDiaries).mockReturnValue({ data: [] } as never);
  });

  it("대시보드 제목과 날짜가 렌더링된다", () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText("대시보드")).toBeInTheDocument();
  });

  it("TODO 카드가 렌더링된다", () => {
    vi.mocked(useTodos).mockReturnValue({
      data: [
        {
          id: "1",
          title: "테스트",
          completed: false,
          priority: 1,
          userId: "u1",
          createdAt: "",
          updatedAt: "",
        },
      ],
    } as never);
    render(<Dashboard />, { wrapper });
    expect(screen.getByText("TODO")).toBeInTheDocument();
    expect(screen.getByText("1개 남음")).toBeInTheDocument();
  });

  it("오늘 일정 카드가 렌더링된다", () => {
    vi.mocked(useEvents).mockReturnValue({
      data: [{ id: "1", title: "회의", start: "", end: "" }],
    } as never);
    render(<Dashboard />, { wrapper });
    expect(screen.getByText("오늘 일정")).toBeInTheDocument();
    expect(screen.getByText("1개")).toBeInTheDocument();
  });

  it("뽀모도로 통계가 렌더링된다", () => {
    vi.mocked(usePomodoroStats).mockReturnValue({
      data: { totalSeconds: 4500, count: 3 },
    } as never);
    render(<Dashboard />, { wrapper });
    expect(screen.getByText("뽀모도로")).toBeInTheDocument();
    expect(screen.getByText("3세션")).toBeInTheDocument();
  });

  it("오늘 일기 상태가 표시된다", () => {
    const today = new Date().toISOString().slice(0, 10);
    vi.mocked(useDiaries).mockReturnValue({
      data: [
        {
          id: "1",
          date: today,
          mood: "happy",
          content: "좋은 하루",
          userId: "u1",
          createdAt: "",
          updatedAt: "",
        },
      ],
    } as never);
    render(<Dashboard />, { wrapper });
    expect(screen.getByText("오늘 일기")).toBeInTheDocument();
    expect(screen.getByText("작성됨")).toBeInTheDocument();
  });
});
