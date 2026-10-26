import PageHeader from '../PageHeader';
import CalculatorClient from './CalculatorClient';

export const metadata = { title: 'Installment Calculator - MicroLoan Admin' };

export default function CalculatorPage() {
  return (
    <div>
      <PageHeader title="Installment Calculator" />
      <CalculatorClient />
    </div>
  );
}
