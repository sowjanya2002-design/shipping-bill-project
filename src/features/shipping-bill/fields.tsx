import { createContext, useContext, type ReactNode } from 'react';
import { useFormContext, type FieldPath } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import type { ShippingBillFormValues } from './model';
import type { ReferenceData } from './service';

export const OptionsContext = createContext<ReferenceData>({});
export const ErrorsContext = createContext<Record<string, string>>({});
export function Field({ name, label, type = 'text', required = false, placeholder, disabled, optionsKey }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; disabled?: boolean; optionsKey?: string }) {
  const { register } = useFormContext<ShippingBillFormValues>();
  const options = useContext(OptionsContext);
  const errors = useContext(ErrorsContext);
  const key = optionsKey ?? name.split('.').at(-1) ?? name;
  const list = options[key];
  const props = { ...register(name as FieldPath<ShippingBillFormValues>), id: name, className: 'form-control', 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined, disabled };
  return <div className="min-w-0"><label htmlFor={name} className="mb-2 block text-xs font-medium">{label}{required && <span className="ml-1 text-destructive">*</span>}</label>{list ? <select {...props}><option value="">{placeholder ?? 'Select an option'}</option>{list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : type === 'textarea' ? <textarea {...props} placeholder={placeholder} /> : <input {...props} type={type} step={type === 'number' ? 'any' : undefined} placeholder={placeholder} />}{errors[name] && <p id={`${name}-error`} className="mt-1.5 text-xs text-destructive">{errors[name]}</p>}</div>;
}
export function Fields({ prefix = '', names, numeric = false }: { prefix?: string; names: string[]; numeric?: boolean }) {
  return <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{names.map(name => <Field key={name} name={`${prefix}${name}`} label={fieldLabel(name)} type={/Date$/.test(name) ? 'date' : numeric || /(?:Amount|Quantity|Rate|Cap|Weight|Charges|Value|Units|Packages|Total)$/.test(name) ? 'number' : 'text'} />)}</div>;
}
export function fieldLabel(name: string) { return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^(.)/, c => c.toUpperCase()).replace('Ar4', 'AR4').replace('Igst', 'IGST').replace('Dbk', 'DBK').replace('Rosctl', 'ROSCTL').replace('Rodtep', 'RoDTEP'); }
export function Advanced({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group border-t border-border py-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted-foreground"><ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />{title}</summary><div className="pt-5">{children}</div></details>;
}
export function Section({ number, title, children }: { number?: string; title: string; children: ReactNode }) {
  return <section className="border-b border-border py-7"><h2 className="mb-6 flex items-center gap-3 text-[15px] font-semibold">{number && <span className="section-marker">{number}</span>}{title}</h2>{children}</section>;
}