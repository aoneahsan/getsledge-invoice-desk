// Developer: Ahsan Mahmood | https://aoneahsan.com
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Invoice, InvoiceStatus } from "../shared/invoice";
import { decideInvoice, fetchInvoice, fetchInvoices } from "./api";
import { t } from "./i18n";

type Tab = "processing" | "needs_review" | "decided";
type Route = { tab: Tab; id: string | null };
const tabs: Tab[] = ["processing", "needs_review", "decided"];

function routeFromUrl(): Route {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  return {
    tab: tab === "processing" || tab === "decided" ? tab : "needs_review",
    id: params.get("id"),
  };
}

function statusLabel(status: InvoiceStatus): string {
  return {
    processing: t("processing"),
    needs_review: t("needsReview"),
    approved: t("approved"),
    rejected: t("rejected"),
  }[status];
}

function tabLabel(tab: Tab): string {
  return tab === "decided" ? t("decided") : statusLabel(tab);
}

function money(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amountCents / 100,
  );
}

function StatusTag({ status }: { status: InvoiceStatus }) {
  const tone =
    status === "approved"
      ? "good"
      : status === "rejected"
        ? "bad"
        : status === "processing"
          ? "neutral"
          : "";
  return <span className={`tag ${tone}`}>{statusLabel(status)}</span>;
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromUrl);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [listError, setListError] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [detailReload, setDetailReload] = useState(0);
  const [decisionError, setDecisionError] = useState(false);
  const [saving, setSaving] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    processing: null,
    needs_review: null,
    decided: null,
  });

  useEffect(() => {
    document.title = t("pageTitle");
  }, []);

  const reloadList = useCallback(async (signal?: AbortSignal) => {
    setListError(false);
    try {
      setInvoices(await fetchInvoices(signal));
    } catch (error) {
      if ((error as Error).name !== "AbortError") setListError(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reloadList(controller.signal);
    return () => controller.abort();
  }, [reloadList]);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const rows = useMemo(
    () =>
      (invoices ?? [])
        .filter((invoice) =>
          route.tab === "decided"
            ? invoice.status === "approved" || invoice.status === "rejected"
            : invoice.status === route.tab,
        )
        .sort(
          (first, second) =>
            second.issueDate.localeCompare(first.issueDate) ||
            second.id.localeCompare(first.id),
        ),
    [invoices, route.tab],
  );
  const selectedId = rows.some((invoice) => invoice.id === route.id)
    ? route.id
    : (rows[0]?.id ?? null);

  useEffect(() => {
    if (!invoices || selectedId === route.id) return;
    const params = new URLSearchParams();
    params.set("tab", route.tab);
    if (selectedId) params.set("id", selectedId);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`,
    );
  }, [invoices, route.tab, route.id, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetail(null);
    setDetailError(false);
    void fetchInvoice(selectedId, controller.signal)
      .then(setDetail)
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setDetailError(true);
      });
    return () => controller.abort();
  }, [selectedId, detailReload]);

  function navigate(tab: Tab, id: string | null): void {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (id) params.set("id", id);
    window.history.pushState(null, "", `${window.location.pathname}?${params}`);
    setRoute({ tab, id });
    setDecisionError(false);
  }

  function onTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    tab: Tab,
  ): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(tab);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    const nextTab = tabs[next]!;
    tabRefs.current[nextTab]?.focus();
    navigate(nextTab, null);
  }

  async function onDecision(status: "approved" | "rejected"): Promise<void> {
    if (!detail || saving) return;
    setSaving(true);
    setDecisionError(false);
    try {
      const updated = await decideInvoice(detail.id, status);
      setInvoices(
        (previous) =>
          previous?.map((invoice) =>
            invoice.id === updated.id ? updated : invoice,
          ) ?? null,
      );
      setDetail(updated);
      navigate("decided", updated.id);
    } catch {
      setDecisionError(true);
    } finally {
      setSaving(false);
    }
  }

  const countFor = (tab: Tab) =>
    (invoices ?? []).filter((invoice) =>
      tab === "decided"
        ? invoice.status === "approved" || invoice.status === "rejected"
        : invoice.status === tab,
    ).length;
  const original = detail?.duplicateOf
    ? invoices?.find((invoice) => invoice.id === detail.duplicateOf)
    : null;

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            {t("brandInitial")}
          </span>
          {t("brand")}
        </div>
        <nav aria-label={t("navigation")}>
          <p className="rail-label">{t("workspace")}</p>
          <a className="rail-link active" href="/">
            {t("invoiceDesk")}
          </a>
        </nav>
        <div className="rail-foot">{t("railFoot")}</div>
      </aside>
      <main className="main">
        <div className="topline">
          <span>
            {t("workspace")} <b aria-hidden="true">/</b>{" "}
            <strong>{t("invoiceDesk")}</strong>
          </span>
          <span className="avatar" aria-label={t("author")}>
            {t("authorInitials")}
          </span>
        </div>
        <header className="intro">
          <div>
            <p className="eyebrow">{t("financeWorkspace")}</p>
            <h1>{t("invoiceDesk")}</h1>
            <p>{t("intro")}</p>
          </div>
          <div className="summary">
            <b>{countFor("needs_review")}</b>
            {t("reviewSuffix")}
          </div>
        </header>
        <section className="board" aria-label={t("invoiceDesk")}>
          <div className="tabs" role="tablist" aria-label={t("statusTabs")}>
            {tabs.map((tab) => (
              <button
                key={tab}
                ref={(element) => {
                  tabRefs.current[tab] = element;
                }}
                className="tab"
                type="button"
                role="tab"
                id={`tab-${tab}`}
                aria-controls="invoice-panel"
                aria-selected={route.tab === tab}
                tabIndex={route.tab === tab ? 0 : -1}
                onClick={() => navigate(tab, null)}
                onKeyDown={(event) => onTabKeyDown(event, tab)}
              >
                {tabLabel(tab)} <span>{countFor(tab)}</span>
              </button>
            ))}
          </div>
          <div
            className="workspace"
            id="invoice-panel"
            role="tabpanel"
            aria-labelledby={`tab-${route.tab}`}
          >
            <div className="list">
              <div className="list-head">
                <strong>{tabLabel(route.tab)}</strong>
                <small>{t("invoiceCount")(rows.length)}</small>
              </div>
              {listError ? (
                <div className="empty" role="alert">
                  {t("loadError")}{" "}
                  <button
                    className="text-button"
                    onClick={() => void reloadList()}
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : invoices === null ? (
                <p className="empty" role="status">
                  {t("loading")}
                </p>
              ) : rows.length === 0 ? (
                <p className="empty">{t("empty")}</p>
              ) : (
                <div className="invoice-list">
                  {rows.map((invoice) => (
                    <button
                      type="button"
                      key={invoice.id}
                      className={`invoice ${invoice.id === selectedId ? "selected" : ""}`}
                      aria-current={
                        invoice.id === selectedId ? "true" : undefined
                      }
                      aria-label={t("viewInvoice")(
                        invoice.vendor,
                        invoice.invoiceNumber,
                      )}
                      onClick={() => navigate(route.tab, invoice.id)}
                    >
                      <span className="vendor-mark" aria-hidden="true">
                        {invoice.vendor.charAt(0)}
                      </span>
                      <span>
                        <b>{invoice.vendor}</b>
                        <small>
                          {invoice.invoiceNumber} · {invoice.issueDate}
                        </small>
                        {invoice.duplicateOf && (
                          <span className="tag">{t("possibleDuplicate")}</span>
                        )}
                      </span>
                      <span className="amount">
                        {money(invoice.amountCents, invoice.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="detail">
              {detailError ? (
                <div className="empty" role="alert">
                  {t("loadError")}{" "}
                  <button
                    className="text-button"
                    onClick={() => setDetailReload((value) => value + 1)}
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : !selectedId ? (
                <p className="empty">{t("selectInvoice")}</p>
              ) : !detail || detail.id !== selectedId ? (
                <p className="empty" role="status">
                  {t("loading")}
                </p>
              ) : (
                <>
                  <div className="detail-head">
                    <div>
                      <small>
                        {t("invoicePrefix")} {detail.invoiceNumber}
                      </small>
                      <h2>{detail.vendor}</h2>
                      <p>{detail.description}</p>
                    </div>
                    <StatusTag status={detail.status} />
                  </div>
                  <div className="total">
                    <span>{t("invoiceTotal")}</span>
                    <strong>
                      {money(detail.amountCents, detail.currency)}
                    </strong>
                  </div>
                  <div className="fields">
                    <div>
                      <span className="field-label">{t("invoiceDate")}</span>
                      <span className="field-value">{detail.issueDate}</span>
                    </div>
                    <div>
                      <span className="field-label">{t("dueDate")}</span>
                      <span className="field-value">{detail.dueDate}</span>
                    </div>
                    <div>
                      <span className="field-label">{t("invoiceNumber")}</span>
                      <span className="field-value">
                        {detail.invoiceNumber}
                      </span>
                    </div>
                    <div>
                      <span className="field-label">{t("status")}</span>
                      <span className="field-value">
                        {statusLabel(detail.status)}
                      </span>
                    </div>
                  </div>
                  {detail.duplicateOf && (
                    <div className="note">
                      <b>{t("possibleDuplicate")}</b>
                      <br />
                      {original && (
                        <>
                          {t("duplicateDescription")(original.vendor)}{" "}
                          <button
                            className="text-button"
                            onClick={() => navigate("decided", original.id)}
                          >
                            {t("viewOriginal")(original.invoiceNumber)}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {detail.status === "needs_review" ? (
                    <>
                      <div className="actions">
                        <button
                          type="button"
                          className="action approve"
                          disabled={saving}
                          onClick={() => void onDecision("approved")}
                        >
                          {saving ? t("saving") : t("approveInvoice")}
                        </button>
                        <button
                          type="button"
                          className="action reject"
                          disabled={saving}
                          onClick={() => void onDecision("rejected")}
                        >
                          {t("reject")}
                        </button>
                      </div>
                      {decisionError && (
                        <p className="action-error" role="alert">
                          {t("decisionError")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="quiet">
                      {detail.status === "processing"
                        ? t("processingMessage")
                        : t("decidedMessage")}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
