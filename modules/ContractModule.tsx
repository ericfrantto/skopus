import React, { useState, useRef } from 'react';
import { ContractInput } from '../types';
import { ICONS } from '../constants';
import { geminiService } from '../services/geminiService';
import { jsPDF } from 'jspdf';

const ContractModule: React.FC = () => {
  const [input, setInput] = useState<ContractInput>({
    serviceName: '',
    providerName: '',
    providerId: '',
    clientName: '',
    clientId: '',
    value: '',
    deadline: '',
    location: '',
    date: new Date().toLocaleDateString('pt-BR'),
    delayFine: true,
    defaultFine: true,
    extraInfo: '',
    logoUrl: ''
  });

  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [contractText, setContractText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInput(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: keyof ContractInput, value: any) => {
    setInput(prev => ({ ...prev, [field]: value }));
    if (errors.has(field as string)) {
      const newErrors = new Set(errors);
      newErrors.delete(field as string);
      setErrors(newErrors);
    }
  };

  const handleGenerate = async () => {
    const requiredFields: (keyof ContractInput)[] = [
      'serviceName', 
      'value', 
      'deadline', 
      'providerName', 
      'providerId', 
      'clientName', 
      'clientId',
      'location',
      'date'
    ];

    const missingFields = requiredFields.filter(field => !input[field]?.toString().trim());

    if (missingFields.length > 0) {
      setErrors(new Set(missingFields as string[]));
      alert('Por favor, preencha todos os campos obrigatórios (marcados com *) para gerar o contrato.');
      return;
    }

    setErrors(new Set());
    setLoading(true);
    try {
      const result = await geminiService.generateContract(input);
      setContractText(result);
      setGenerated(true);
    } catch (err) {
      console.error(err);
      alert('Falha ao gerar contrato com IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!contractText) return;
    
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - (margin * 2);
    let cursorY = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const plainText = contractText.replace(/\*\*/g, '');
    const lines = doc.splitTextToSize(plainText, maxLineWidth);

    lines.forEach((line: string) => {
      if (cursorY > 280) {
        doc.addPage();
        cursorY = 20;
      }
      if (line.toUpperCase() === line && line.length > 5) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(line, margin, cursorY);
      cursorY += 6;
    });

    cursorY += 20;
    if (cursorY > 260) {
      doc.addPage();
      cursorY = 20;
    }
    
    doc.line(margin, cursorY, margin + 70, cursorY);
    doc.line(pageWidth - margin - 70, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;
    doc.setFontSize(8);
    doc.text(input.providerName, margin, cursorY);
    doc.text(input.clientName, pageWidth - margin, cursorY, { align: 'right' });

    doc.save(`contrato_${input.clientName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const getFieldClass = (fieldName: string) => {
    const base = "w-full bg-white dark:bg-black border rounded-xl px-4 py-3 font-helvetica-400 text-sm outline-none transition-all";
    const errorColor = "border-[#FE7317] ring-1 ring-[#FE7317]";
    const normalColor = "border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-[#FE7317]";
    return `${base} ${errors.has(fieldName) ? errorColor : normalColor}`;
  };

  const ContractPreview = () => (
    <div id="contract-view" className="bg-white text-black p-12 shadow-2xl rounded-sm border border-gray-200 max-w-4xl mx-auto space-y-6 text-sm print:shadow-none print:border-none print:p-0 leading-relaxed min-h-[1100px] flex flex-col justify-between" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="animate-in fade-in duration-700">
        {input.logoUrl && (
          <div className="mb-10 flex justify-start">
            <img src={input.logoUrl} alt="Logo" className="max-h-20 max-w-[200px] object-contain" />
          </div>
        )}
        
        <div className="whitespace-pre-wrap font-helvetica-400">
          {contractText.split('\n').map((line, i) => {
            const cleanLine = line.replace(/#/g, '').trim();
            if (!cleanLine && i > 0) return <div key={i} className="h-2" />;
            
            const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
            const isTitle = cleanLine.toUpperCase() === cleanLine && cleanLine.length > 3 && !cleanLine.includes(' ');
            const isClause = cleanLine.startsWith('CLÁUSULA') || cleanLine.match(/^\d+\./);

            return (
              <p key={i} className={`mb-4 ${isTitle || isClause ? 'font-bold text-base mt-6' : 'font-helvetica-400'}`}>
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </p>
            );
          })}
        </div>
      </div>

      <div className="pt-24 flex justify-between gap-16 mt-20 mb-8 font-helvetica-400">
        <div className="flex-1 border-t border-black text-center pt-3 italic font-bold">
          {input.providerName || 'Contratada'}<br/>
          <span className="text-[10px] not-italic opacity-60 uppercase tracking-widest font-normal">CONTRATADA</span>
        </div>
        <div className="flex-1 border-t border-black text-center pt-3 italic font-bold">
          {input.clientName || 'Contratante'}<br/>
          <span className="text-[10px] not-italic opacity-60 uppercase tracking-widest font-normal">CONTRATANTE</span>
        </div>
      </div>
      
      <div className="text-[9px] text-center opacity-30 mt-auto">
        Documento gerado eletronicamente via skópus • Intelligence
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="print:hidden">
        <h2 className="text-3xl font-bold uppercase tracking-tight dark:text-white leading-none mb-2">Contrato Inteligente</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Design jurídico e clareza para seus negócios.</p>
      </header>

      {!generated ? (
        <div className="bg-[#F7F7F7] dark:bg-[#121218] p-8 rounded-[1.5rem] border border-gray-200 dark:border-gray-800 shadow-sm print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2">Especificações do Serviço</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#FE7317] hover:text-[#FE7317] transition-all bg-white dark:bg-black overflow-hidden relative group"
                   >
                     {input.logoUrl ? (
                       <>
                         <img src={input.logoUrl} className="w-full h-full object-contain p-2" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[8px] text-white font-bold uppercase">Trocar</span>
                         </div>
                       </>
                     ) : (
                       <>
                         <span className="text-xl">⊕</span>
                         <span className="text-[8px] font-bold uppercase tracking-tighter">Sua Logo</span>
                       </>
                     )}
                   </button>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     className="hidden" 
                     accept="image/*" 
                     onChange={handleLogoUpload} 
                   />
                   <div className="flex-1">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Título do Serviço *</label>
                      <input 
                        placeholder="Ex: Desenvolvimento de Site Institucional"
                        className={getFieldClass('serviceName')}
                        value={input.serviceName} 
                        onChange={e => handleInputChange('serviceName', e.target.value)}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Valor (R$) *</label>
                    <input 
                      placeholder="2.500,00" 
                      className={getFieldClass('value')}
                      value={input.value} 
                      onChange={e => handleInputChange('value', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Prazo (Dias) *</label>
                    <input 
                      placeholder="30" 
                      className={getFieldClass('deadline')}
                      value={input.deadline} 
                      onChange={e => handleInputChange('deadline', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Local *</label>
                    <input 
                      placeholder="Ex: Recife - PE" 
                      className={getFieldClass('location')}
                      value={input.location} 
                      onChange={e => handleInputChange('location', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Data *</label>
                    <input 
                      placeholder="Ex: 24/05/2024" 
                      className={getFieldClass('date')}
                      value={input.date} 
                      onChange={e => handleInputChange('date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2">Identificação das Partes</h3>
              <div className="space-y-3">
                <input 
                  placeholder="Sua Empresa / Nome *" 
                  className={getFieldClass('providerName')}
                  value={input.providerName} 
                  onChange={e => handleInputChange('providerName', e.target.value)}
                />
                <input 
                  placeholder="Seu CPF ou CNPJ *" 
                  className={getFieldClass('providerId')}
                  value={input.providerId} 
                  onChange={e => handleInputChange('providerId', e.target.value)}
                />
              </div>
              <div className="space-y-3 pt-2">
                <input 
                  placeholder="Nome do Cliente / Empresa *" 
                  className={getFieldClass('clientName')}
                  value={input.clientName} 
                  onChange={e => handleInputChange('clientName', e.target.value)}
                />
                <input 
                  placeholder="CPF ou CNPJ do Cliente *" 
                  className={getFieldClass('clientId')}
                  value={input.clientId} 
                  onChange={e => handleInputChange('clientId', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
             <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Informações extras / Cláusulas específicas</label>
             <textarea 
               placeholder="Descreva detalhes adicionais, obrigações específicas ou acordos verbais que devem ser formalizados..."
               className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 font-helvetica-400 text-sm min-h-[100px] outline-none focus:ring-1 focus:ring-[#FE7317]"
               value={input.extraInfo} onChange={e => handleInputChange('extraInfo', e.target.value)}
             />
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={input.delayFine} onChange={e => handleInputChange('delayFine', e.target.checked)} className="accent-[#FE7317] w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-gray-600 transition-colors">Mora (2%)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={input.defaultFine} onChange={e => handleInputChange('defaultFine', e.target.checked)} className="accent-[#FE7317] w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-gray-600 transition-colors">Rescisória (20%)</span>
              </label>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#FE7317] text-white font-bold uppercase tracking-widest py-4 px-12 rounded-xl shadow-xl shadow-[#FE7317]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando...
                </>
              ) : 'Gerar contrato'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center print:hidden">
            <button onClick={() => setGenerated(false)} className="text-gray-500 hover:text-[#FE7317] flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest transition-colors">
              ← Ajustar Dados
            </button>
            <div className="flex gap-3">
              <button onClick={handleGenerate} className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-4 px-6 rounded-xl text-xs uppercase tracking-widest hover:bg-gray-300 transition-all">
                Refazer
              </button>
              <button onClick={handleDownload} className="bg-[#FE7317] text-white font-bold py-4 px-10 rounded-xl flex items-center gap-3 shadow-xl uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">
                <ICONS.Download className="w-4 h-4" />
                Baixar PDF
              </button>
            </div>
          </div>
          <ContractPreview />
        </div>
      )}
    </div>
  );
};

export default ContractModule;