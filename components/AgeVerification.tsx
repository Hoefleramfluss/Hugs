import React from 'react';

interface AgeVerificationProps {
  onVerify: () => void;
}

const AgeVerification: React.FC<AgeVerificationProps> = ({ onVerify }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white text-black p-8 rounded-lg shadow-xl text-center max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Age Verification</h1>
        <p className="mb-6">
          This website is intended for adults. You must be 18 years of age or older to enter.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={onVerify}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md w-full sm:w-auto"
          >
            I am 18 or older
          </button>
          <a
            href="https://www.google.com"
            className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-3 px-6 rounded-md w-full sm:w-auto"
          >
            Exit
          </a>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;
