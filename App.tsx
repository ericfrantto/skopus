
import React, { useState } from 'react';
import Layout from './components/Layout';
import SDRModule from './modules/SDRModule';
import CopyModule from './modules/CopyModule';
import ContractModule from './modules/ContractModule';
import { AppSection } from './types';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.SDR);

  const renderContent = () => {
    switch (activeSection) {
      case AppSection.SDR:
        return <SDRModule />;
      case AppSection.COPY:
        return <CopyModule />;
      case AppSection.CONTRACT:
        return <ContractModule />;
      default:
        return <SDRModule />;
    }
  };

  return (
    <Layout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </Layout>
  );
};

export default App;
