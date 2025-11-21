'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      <header className="flex justify-between items-center p-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚔️</span>
          <h1 className="text-2xl font-bold text-white">Ronin Rumble</h1>
        </div>
        <ConnectButton />
      </header>

      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-6xl font-bold text-white mb-4">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Ronin Rumble
          </span>
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Web3 Card Autobattler - Coming Soon
        </p>
        <p className="text-gray-400">
          10-minute matches • 6-player lobbies • Position-based combat
        </p>
      </div>
    </main>
  );
}
