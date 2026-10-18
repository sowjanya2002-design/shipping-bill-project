import type { Branch, Business, Exporter, ShippingBillFormValues } from './model';
import { countries, loadingPorts, ports } from './data/ports';
import { seed } from './data/parties';
import { cargoOptions, contractTypes, paymentTypes, priceInclusionTypes, sealTypes, weightUnits } from './data/options';
import { quantityCodes } from './data/quantity-code';
import schemes from './data/scheme-codes';
import { stateOptions } from './data/states';
import { Trades } from './data/trade-agrements';
import { documentCodes } from './data/e-sanchit-codes';
import { validateBill, invoiceTotal } from './validation';

export interface Option { value: string; label: string }
export type ReferenceData = Record<string, Option[]>;
export type PartyKind = 'exporter' | 'consignee' | 'buyer' | 'thirdParty';
export type Party = Exporter | Business;
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 300));
let exporters: Exporter[] = structuredClone(seed.exporters);
let businesses: Business[] = structuredClone(seed.businesses);
let nextId = 10000;
const savedBills = new Map<string, ShippingBillFormValues>();

/** This browser-only, asynchronous adapter is replaceable by an HTTP implementation. */
export const shippingBillService = {
  async getOptions(): Promise<ReferenceData> {
    await pause();
    const data = {
      loadingPort: loadingPorts.map(p => ({ value: p.code, label: `${p.name} · ${p.code}` })),
      finalDestinationPort: ports.map(p => ({ value: p.code, label: `${p.name} · ${p.code}` })),
      dischargePort: ports.map(p => ({ value: p.code, label: `${p.name} · ${p.code}` })),
      countries, natureOfCargo: cargoOptions, contractType: contractTypes, natureOfPayment: paymentTypes,
      freightInsuranceIncluded: priceInclusionTypes, sealType: sealTypes, measurementUnit: weightUnits,
      unitOfMeasurement: quantityCodes, unitOfRate: quantityCodes, schemeCode: schemes,
      originStateCode: stateOptions.map(o => ({ ...o, value: String(o.value) })),
      tradeAgreementsCode: Trades, documentTypeCode: documentCodes,
      currency: ['USD', 'INR', 'EUR', 'AED', 'GBP', 'SGD'].map(value => ({ value, label: value })),
      nfeiCategory: [['01', 'Free trade sample'], ['02', 'Diplomatic goods'], ['03', 'Warranty replacement'], ['07', 'Gift parcel'], ['08', 'Other']].map(([value, label]) => ({ value: value ?? "", label: label ?? "" })),
      igstPaymentStatus: [{ value: 'NA', label: 'Not applicable' }, { value: 'LUT', label: 'Under LUT / bond' }, { value: 'P', label: 'Against payment' }],
      accessoryStatus: [{ value: '0', label: 'No accessories' }, { value: '1', label: 'Accessories included' }],
      containerSize: [{ value: '20', label: '20 ft' }, { value: '40', label: '40 ft' }],
      indigenousOrImported: [{ value: 'I', label: 'Indigenous' }, { value: 'M', label: 'Imported' }],
      fileType: ['PDF', 'JPG', 'PNG'].map(value => ({ value, label: value })),
    };
    return structuredClone(data);
  },
  async searchParties(kind: PartyKind, query = ''): Promise<Party[]> {
    await pause();
    const list = kind === 'exporter' ? exporters.filter(p => !p.disabled) : businesses.filter(p => kind === 'consignee' ? p.isConsignee : kind === 'buyer' ? p.isBuyer : p.isThirdParty);
    return structuredClone(list.filter(p => `${p.name} ${p.iec ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())));
  },
  async getParty(kind: PartyKind, id: string): Promise<Party | undefined> {
    await pause();
    return structuredClone((kind === 'exporter' ? exporters : businesses).find(p => String(p.id) === id));
  },
  async createParty(kind: PartyKind, values: Record<string, string | boolean>): Promise<Party> {
    await pause();
    if (String(values['name'] ?? '').trim().length < 2) throw new Error('Enter a party name with at least two characters.');
    const text = (key: string) => String(values[key] ?? '').trim();
    const branch: Branch = { id: nextId++, branchName: text('branchName'), address1: text('address1'), address2: text('address2'), city: text('city'), countryCode: text('countryCode'), state: text('state'), pincode: text('pincode'), gstnId: text('gstnId'), adCode: text('adCode'), email: text('email'), mobile: text('mobile'), accountNo: text('accountNo'), ifscCode: text('ifscCode') };
    if (!branch.branchName || !branch.address1 || !branch.city || !branch.countryCode) throw new Error('Enter the branch name, address, city, and country.');
    const base = { id: nextId++, name: text('name'), iec: text('iec'), branches: [branch] };
    if (kind === 'exporter') {
      const party: Exporter = { ...base, class: text('class') || 'F', type: text('type') || 'P', pan: text('pan'), tan: text('tan'), aeoNumber: text('aeoNumber'), website: text('website'), notes: text('notes') };
      exporters = [...exporters, party];
      return structuredClone(party);
    }
    const party: Business = { ...base, isConsignee: kind === 'consignee' || !!values['isConsignee'], isBuyer: kind === 'buyer' || !!values['isBuyer'], isNotify: !!values['isNotify'], isThirdParty: kind === 'thirdParty' || !!values['isThirdParty'] };
    businesses = [...businesses, party];
    return structuredClone(party);
  },
  async createBranch(kind: PartyKind, id: string, values: Omit<Branch, 'id'>): Promise<Branch> {
    await pause();
    const party = (kind === 'exporter' ? exporters : businesses).find(p => String(p.id) === id);
    if (!party) throw new Error('The selected party could not be found.');
    if (!values.branchName.trim() || !values.address1.trim() || !values.city.trim() || !values.countryCode) throw new Error('Enter the branch name, address, city, and country.');
    const branch = { ...values, id: nextId++ };
    party.branches = [...party.branches, branch];
    return structuredClone(branch);
  },
  async submit(values: ShippingBillFormValues) {
    await pause();
    if (Object.keys(validateBill(values)).length) throw new Error('Please correct the highlighted fields before submitting.');
    const snapshot = structuredClone(values);
    snapshot.dischargePort ||= snapshot.finalDestinationPort;
    snapshot.numberOfContainers = String(snapshot.containers.length || Number(snapshot.numberOfContainers) || 0);
    snapshot.invoices = snapshot.invoices.map(invoice => ({ ...invoice, invoiceTotal: String(invoice.invoiceTotal?.trim() ? Number(invoice.invoiceTotal) : invoiceTotal(invoice)), buyerId: invoice.buyerSameAsConsignee ? snapshot.consigneeId : invoice.buyerId, buyerBranchId: invoice.buyerSameAsConsignee ? snapshot.consigneeBranchId : invoice.buyerBranchId }));
    const id = `SB-${String(nextId++).padStart(6, '0')}`;
    savedBills.set(id, snapshot);
    return { id, values: structuredClone(snapshot) };
  },
  async getBill(id: string) { await pause(); return structuredClone(savedBills.get(id)); },
};