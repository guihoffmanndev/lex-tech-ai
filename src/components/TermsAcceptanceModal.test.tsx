import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/legalContent", () => ({
  termsOfUse: "Conteúdo dos Termos de Uso.",
  privacyPolicy: "Conteúdo da Política de Privacidade.",
}));

import { useAuth } from "@/contexts/AuthContext";
import { TermsAcceptanceModal } from "./TermsAcceptanceModal";

const mockUseAuth = vi.mocked(useAuth);

describe("TermsAcceptanceModal", () => {
  const mockAcceptTerms = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não renderiza quando o usuário não está autenticado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      needsTermsAcceptance: false,
      acceptTerms: mockAcceptTerms,
      logout: mockLogout,
    } as any);
    const { container } = render(<TermsAcceptanceModal />);
    expect(container.firstChild).toBeNull();
  });

  it("não renderiza quando os termos já foram aceitos", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsTermsAcceptance: false,
      acceptTerms: mockAcceptTerms,
      logout: mockLogout,
    } as any);
    const { container } = render(<TermsAcceptanceModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza quando autenticado e termos não aceitos", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsTermsAcceptance: true,
      acceptTerms: mockAcceptTerms,
      logout: mockLogout,
    } as any);
    render(<TermsAcceptanceModal />);
    expect(
      screen.getByText("Termos de Uso e Política de Privacidade")
    ).toBeInTheDocument();
  });

  it("botão Aceitar está desabilitado até o checkbox ser marcado", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsTermsAcceptance: true,
      acceptTerms: mockAcceptTerms,
      logout: mockLogout,
    } as any);
    render(<TermsAcceptanceModal />);
    const acceptButton = screen.getByRole("button", { name: /aceitar e continuar/i });
    expect(acceptButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(acceptButton).not.toBeDisabled();
  });

  it("chama acceptTerms ao clicar em Aceitar com checkbox marcado", async () => {
    mockAcceptTerms.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsTermsAcceptance: true,
      acceptTerms: mockAcceptTerms,
      logout: mockLogout,
    } as any);
    render(<TermsAcceptanceModal />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /aceitar e continuar/i }));

    await waitFor(() => {
      expect(mockAcceptTerms).toHaveBeenCalledOnce();
    });
  });

  it("chama logout ao clicar em Não aceitar", async () => {
    mockLogout.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsTermsAcceptance: true,
      acceptTerms: mockAcceptTerms,
      logout: mockLogout,
    } as any);
    render(<TermsAcceptanceModal />);

    fireEvent.click(screen.getByRole("button", { name: /não aceitar/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledOnce();
    });
  });
});
