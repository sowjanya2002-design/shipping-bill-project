import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emptyBill, type ShippingBillFormValues } from './model';
import { shippingBillService, type ReferenceData } from './service';
import { ErrorsContext, OptionsContext } from './fields';
import { DetailsSection } from './details-section';
import { InvoicesSection } from './invoices-section';
import { OthersSection } from './others-section';
import { formatAmount, invoiceTotal, validateBill } from './validation';

const tabs = ['Details', 'Invoices & goods', 'Others'];
export function ShippingBillForm() {
  const form = useForm<ShippingBillFormValues>({ defaultValues: emptyBill(), shouldUnregister: false });
  const [tab, setTab] = useState(0);
  const [options, setOptions] = useState<ReferenceData>();
  const [loadingError, setLoadingError] = useState('');
  const [retry, setRetry] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ id: string; values: ShippingBillFormValues }>();
  useEffect(() => { let active = true; setLoadingError(''); shippingBillService.getOptions().then(data => { if (active) setOptions(data); }).catch(() => { if (active) setLoadingError('Unable to load form options. Please try again.'); }); return () => { active = false; }; }, [retry]);
  async function submit(data: ShippingBillFormValues) {
    setSubmitError(''); const issues = validateBill(data); setErrors(issues);
    const first = Object.keys(issues)[0];
    if (first) {
      setTab(first.startsWith('invoices') ? 1 : /^(documents|containers|licenses|packingRanges)/.test(first) ? 2 : 0);
      setTimeout(() => { document.getElementById(first)?.focus(); document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
      return;
    }
    setBusy(true);
    try { const result = await shippingBillService.submit(data); const readBack = await shippingBillService.getBill(result.id); if (!readBack) throw new Error('The saved bill could not be retrieved.'); setSaved({ id: result.id, values: readBack }); }
    catch (e) { setSubmitError(e instanceof Error ? e.message : 'Unable to submit the shipping bill. Try again.'); }
    finally { setBusy(false); }
  }
  const resetForm = () => { if (window.confirm('Clear all entered shipping bill details?')) { form.reset(emptyBill()); setErrors({}); setTab(0); } };
  return (
    <main className="min-h-screen p-2">
      <div className="mx-auto max-w-6xl space-y-5 rounded-xl bg-card p-6">
        <div>
          <button type="button" className="mb-2 text-sm text-muted-foreground hover:underline" onClick={() => setSaved(undefined)}>← Shipping bills</button>
          <h1 className="text-2xl font-semibold">New shipping bill</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter the everyday details first. Open advanced sections only when needed.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step, i) => (
            <div key={step.title} className={`rounded-lg border p-3 ${i === 0 ? 'border-primary/40 bg-accent' : 'border-border bg-muted'}`}>
              <div className="flex items-center gap-2 text-sm font-medium"><span className="flex size-6 items-center justify-center rounded-full bg-card text-xs">{i + 1}</span>{step.title}</div>
              <p className="ml-8 text-xs text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        {saved ? (
          <div className="rounded-lg border border-border p-6">
            <CheckCircle2 className="mb-4 size-8 text-primary" />
            <h2 className="text-xl font-semibold">Shipping bill saved</h2>
            <p className="mt-2 text-sm text-muted-foreground">Reference <span className="font-semibold text-foreground">{saved.id}</span></p>
            <dl className="my-6 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Job number</dt><dd>{saved.values.jobNumber || '—'}</dd></div>
              <div><dt className="text-muted-foreground">Route</dt><dd>{saved.values.loadingPort} → {saved.values.finalDestinationPort}</dd></div>
              {saved.values.invoices.map((inv, index) => <div key={index}><dt className="text-muted-foreground">Invoice {inv.invoiceNumber}</dt><dd>{formatAmount(inv.invoiceTotal?.trim() ? Number(inv.invoiceTotal) : invoiceTotal(inv), inv.currency || 'USD')}</dd></div>)}
            </dl>
            <Button onClick={() => setSaved(undefined)}>Back to form</Button>
          </div>
        ) : !options ? (
          <div className="flex min-h-72 items-center justify-center gap-3">
            {loadingError ? <div role="alert" className="text-center"><p className="mb-4 text-destructive">{loadingError}</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Retry</Button></div> : <><Loader2 className="size-5 animate-spin text-primary" /><span className="text-muted-foreground">Loading form…</span></>}
          </div>
        ) : (
          <FormProvider {...form}><OptionsContext.Provider value={options}><ErrorsContext.Provider value={errors}>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-5">
              <div className="flex w-full overflow-x-auto rounded-lg bg-muted p-1" role="tablist" aria-label="Shipping bill sections">
                {tabs.map((title, i) => (
                  <button key={title} id={`tab-${i}`} type="button" role="tab" aria-selected={tab === i} aria-controls={`panel-${i}`} onClick={() => setTab(i)} className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium ${tab === i ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>{i + 1}. {title}</button>
                ))}
              </div>
              {Object.keys(errors).length > 0 && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">Please correct {Object.keys(errors).length} highlighted field{Object.keys(errors).length === 1 ? '' : 's'} before saving.</p>}
              <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="rounded-lg border border-border p-5">
                {tab === 0 ? <DetailsSection /> : tab === 1 ? <InvoicesSection /> : <OthersSection />}
              </div>
              {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
              <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <div className="flex gap-2">
                  {tab > 0 && <Button type="button" variant="outline" onClick={() => setTab(n => n - 1)}>Previous</Button>}
                  {tab < 2 ? <Button type="button" onClick={() => setTab(n => n + 1)}>Save &amp; Next</Button> : <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{busy ? 'Saving…' : 'Save changes'}</Button>}
                </div>
              </div>
            </form>
          </ErrorsContext.Provider></OptionsContext.Provider></FormProvider>
        )}
      </div>
    </main>
  );
}
const workflowSteps = [
  { title: 'Shipping bill', description: 'Current step' },
  { title: 'Document review', description: 'Planned' },
  { title: 'Customs filing', description: 'Planned' },
  { title: 'Shipment tracking', description: 'Planned' },
];
