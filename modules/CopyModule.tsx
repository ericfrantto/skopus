import React, { useState } from 'react';
import { CopyInput } from '../types';
import { geminiService } from '../services/geminiService';

const CopyModule: React.FC = () => {
  const [input, setInput] = useState<CopyInput>({
    userName: '',
    niche: '',
    contactName: '',
    leadProblem: '',
    solution: '',
    differential: '',
    goal: '',
    tone: 'casual'
  });
  
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof CopyInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: value }));
    if (errors.has(field)) {
      const newErrors = new Set(errors);
      newErrors.delete(field);
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de todos os campos como obrigatórios
    const requiredFields: (keyof CopyInput)[] = [
      'userName', 'niche', 'contactName', 'leadProblem', 'solution', 'differential', 'goal'
    ];
    
    const missingFields = requiredFields.filter(f => !input[f]?.trim());
    
    if (missingFields.length > 0) {
      setErrors(new Set(missingFields));
      alert('Por favor, preencha todos os campos obrigatórios para criar a abordagem.');
      return;
    }

    setLoading(true);
    setOptions([]);
    try {
      const resultText = await geminiService.generateCopy(input);
      // Remove asteriscos para garantir texto limpo
      const cleanedText = resultText.replace(/\*\*/g, '');
      const parts = cleanedText.split('[DIVIDER]').map(p => p.trim()).filter(p => p.length > 0);
      setOptions(parts.length > 0 ? parts : [cleanedText]);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar abordagens.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldClass = (fieldName: string) => {
    const base = "w-full bg-white dark:bg-black border rounded-xl px-4 py-3 font-helvetica-400 text-sm outline-none transition-all";
    const errorColor = "border-[#FE7317] ring-1 ring-[#FE7317]";
    const normalColor = "border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-[#FE7317]";
    return `${base} ${errors.has(fieldName) ? errorColor : normalColor}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Texto copiado!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold uppercase tracking-tight dark:text-white leading-none mb-2">Gerador de Copy</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Abordagens de alta conversão</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#F7F7F7] dark:bg-[#121218] p-8 rounded-[1.5rem] border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Parâmetros de Campanha</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Seu Nome *</label>
              <input 
                className={getFieldClass('userName')}
                value={input.userName}
                onChange={e => handleInputChange('userName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Nicho / Mercado *</label>
              <input 
                className={getFieldClass('niche')}
                placeholder="Ex: Tecnologia, Estética..."
                value={input.niche}
                onChange={e => handleInputChange('niche', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Nome do Lead *</label>
              <input 
                className={getFieldClass('contactName')}
                value={input.contactName}
                onChange={e => handleInputChange('contactName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Diferencial *</label>
              <input 
                className={getFieldClass('differential')}
                placeholder="Ex: Suporte 24h, 10 anos de exp..."
                value={input.differential}
                onChange={e => handleInputChange('differential', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Dor do Lead *</label>
            <textarea 
              rows={2}
              placeholder="Ex: Baixa retenção de alunos na academia..."
              className={getFieldClass('leadProblem')}
              value={input.leadProblem}
              onChange={e => handleInputChange('leadProblem', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Sua Solução *</label>
            <textarea 
              rows={2}
              placeholder="Ex: Consultoria em CX e Fidelização..."
              className={getFieldClass('solution')}
              value={input.solution}
              onChange={e => handleInputChange('solution', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Tom *</label>
              <select 
                className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FE7317] outline-none font-helvetica-400 text-sm"
                value={input.tone}
                onChange={e => handleInputChange('tone', e.target.value as any)}
              >
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="objective">Direto</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Objetivo *</label>
              <input 
                placeholder="Ex: Call de 15min"
                className={getFieldClass('goal')}
                value={input.goal}
                onChange={e => handleInputChange('goal', e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#FE7317] text-white font-bold uppercase tracking-widest py-5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4 shadow-xl shadow-[#FE7317]/20"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando abordagem...
              </>
            ) : 'Gerar Abordagens'}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {options.length > 0 ? (
            options.map((opt, idx) => (
              <div key={idx} className="bg-white dark:bg-black p-8 rounded-[1.5rem] border border-gray-200 dark:border-gray-800 shadow-inner relative overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FE7317]">Opção {idx + 1}</span>
                  <button 
                    onClick={() => copyToClipboard(opt)}
                    className="text-[#FE7317] hover:bg-[#FE7317]/10 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Copiar
                  </button>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-gray-700 dark:text-gray-300 font-helvetica-400 text-sm">
                  {opt}
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 bg-white dark:bg-black p-10 rounded-[1.5rem] border border-gray-200 dark:border-gray-800 shadow-inner min-h-[400px] flex flex-col items-center justify-center text-gray-400 text-center space-y-4 opacity-40">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center text-2xl">
                ✨
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest">Suas abordagens estratégicas<br/>serão exibidas aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopyModule;