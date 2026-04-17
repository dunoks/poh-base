
import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User as FirebaseUser,
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  ShieldCheck, 
  Wallet, 
  Search, 
  PlusCircle, 
  User, 
  CheckCircle2, 
  Award,
  Zap,
  Globe,
  Star,
  ExternalLink,
  ChevronRight,
  Verified
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  reputationScore: number;
  pohVerified: boolean;
  ethosStatus: 'none' | 'bronze' | 'silver' | 'gold';
  walletAddress?: string;
  joinedAt?: any;
}

interface Bounty {
  id: string;
  creatorUid: string;
  title: string;
  description: string;
  reward: number;
  network: string;
  status: 'open' | 'pending' | 'claimed' | 'completed' | 'cancelled';
  requiredReputation: number;
  createdAt: any;
}

// --- Components ---

const Navbar = ({ 
  user, 
  onLogin, 
  onLogout,
  wallet,
  onConnectWallet 
}: { 
  user: FirebaseUser | null, 
  onLogin: () => void, 
  onLogout: () => void,
  wallet: string | null,
  onConnectWallet: () => void
}) => (
  <nav className="border-b border-black p-4 flex justify-between items-center sticky top-0 bg-[#E4E3E0] z-50">
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-8 h-8" />
      <span className="font-mono font-bold text-xl tracking-tighter uppercase italic">BaseTrust</span>
    </div>
    <div className="flex items-center gap-6">
      <div className="hidden md:flex gap-4 font-mono text-xs uppercase tracking-widest">
        <button className="hover:line-through cursor-pointer">Marketplace</button>
        <button className="hover:line-through cursor-pointer">Reputation</button>
        <button className="hover:line-through cursor-pointer">About</button>
      </div>
      <div className="flex items-center gap-3">
        {!wallet ? (
          <button 
            onClick={onConnectWallet}
            className="flex items-center gap-2 border border-black px-3 py-1 text-xs font-mono uppercase hover:bg-black hover:text-[#E4E3E0] transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Connect Base
          </button>
        ) : (
          <div className="border border-black px-3 py-1 text-xs font-mono lowercase opacity-70">
            {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </div>
        )}
        {user ? (
          <div className="flex items-center gap-3">
            <button onClick={onLogout} className="text-xs font-mono uppercase hover:line-through">Logout</button>
            <div className="w-8 h-8 border border-black overflow-hidden bg-white">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="border border-black px-3 py-1 bg-black text-[#E4E3E0] text-xs font-mono uppercase"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  </nav>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'market' | 'profile' | 'create'>('market');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  // Auth & Profile Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: u.uid,
            displayName: u.displayName || 'Anon',
            photoURL: u.photoURL || '',
            reputationScore: 10,
            pohVerified: false,
            ethosStatus: 'none',
            joinedAt: serverTimestamp()
          };
          await setDoc(doc(db, 'users', u.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Bounties Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bounties'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bounty));
      setBounties(bList);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bounties'));
    return unsubscribe;
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => signOut(auth);

  const connectWallet = () => {
    // Simulating Base Wallet connection
    const fakeAddress = "0x" + Math.random().toString(16).slice(2, 42);
    setWallet(fakeAddress);
  };

  const createBounty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const bountyData = {
      creatorUid: user.uid,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      reward: Number(formData.get('reward')),
      network: 'Base',
      status: 'open',
      requiredReputation: Number(formData.get('rep')),
      createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, 'bounties'), bountyData);
      setView('market');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'bounties');
    }
  };

  const togglePOH = async () => {
    if (!user || !profile) return;
    try {
      const newStatus = !profile.pohVerified;
      await updateDoc(doc(db, 'users', user.uid), { 
        pohVerified: newStatus,
        reputationScore: profile.reputationScore + (newStatus ? 50 : -50)
      });
      setProfile(p => p ? { ...p, pohVerified: newStatus, reputationScore: p.reputationScore + (newStatus ? 50 : -50) } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        photoURL: editPhoto
      });
      setProfile({ ...profile, displayName: editName, photoURL: editPhoto });
      setIsEditingProfile(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const startEditing = () => {
    if (profile) {
      setEditName(profile.displayName);
      setEditPhoto(profile.photoURL);
      setIsEditingProfile(true);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-mono animate-pulse uppercase">
        Initializing BaseChain Trust Layer...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        wallet={wallet}
        onConnectWallet={connectWallet}
      />

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {!user ? (
          <section className="h-[70vh] flex flex-col items-center justify-center text-center space-y-8 bg-white border border-black p-12">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none m-0">
              TRUST <br /> WITHOUT <br /> PERMISSION
            </h1>
            <p className="font-mono text-sm max-w-md uppercase opacity-60">
              The decentralized reputation protocol for the Base economy. 
              Verify your humanity. Build your Ethos. Complete Bounties.
            </p>
            <button 
              onClick={handleLogin}
              className="px-12 py-4 bg-black text-[#E4E3E0] font-mono font-bold uppercase hover:scale-105 transition-transform"
            >
              Enter BaseTrust
            </button>
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar Branding & Stats */}
            <aside className="space-y-8">
              <div className="border border-black p-6 bg-white space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 bg-black text-white p-2 flex items-center justify-center">
                    <Verified className="w-full h-full" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-xs uppercase opacity-40">Your Rank</h3>
                    <p className="font-mono font-black text-lg uppercase italic">{profile?.ethosStatus === 'none' ? 'NEOPHYTE' : profile?.ethosStatus}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-xs uppercase opacity-60">
                    <span>Reputation</span>
                    <span>{profile?.reputationScore} RP</span>
                  </div>
                  <div className="h-1 bg-black/10">
                    <div className="h-full bg-black" style={{ width: `${Math.min(100, (profile?.reputationScore || 0) / 2)}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <div className={cn("w-3 h-3 rounded-full shadow-[0_0_8px]", profile?.pohVerified ? "bg-green-500 shadow-green-500" : "bg-red-500 shadow-red-500")}></div>
                  <span className="font-mono text-[10px] uppercase font-bold">POH {profile?.pohVerified ? "VERIFIED" : "REQUIRED"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs uppercase">
                <button 
                  onClick={() => setView('market')}
                  className={cn("w-full text-left p-3 border border-black transition-colors flex items-center justify-between", view === 'market' ? "bg-black text-[#E4E3E0]" : "bg-white hover:bg-black/5")}
                >
                  Marketplace <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setView('create')}
                  className={cn("w-full text-left p-3 border border-black transition-colors flex items-center justify-between", view === 'create' ? "bg-black text-[#E4E3E0]" : "bg-white hover:bg-black/5")}
                >
                  Post Bounty <PlusCircle className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setView('profile')}
                  className={cn("w-full text-left p-3 border border-black transition-colors flex items-center justify-between", view === 'profile' ? "bg-black text-[#E4E3E0]" : "bg-white hover:bg-black/5")}
                >
                  Your Ethos <User className="w-4 h-4" />
                </button>
              </div>
            </aside>

            {/* Main Content */}
            <div className="md:col-span-3 space-y-6">
              <AnimatePresence mode="wait">
                {view === 'market' && (
                  <motion.section 
                    key="market"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-end border-b border-black pb-2">
                       <h2 className="font-mono font-black text-2xl uppercase italic decoration-2 underline-offset-4 decoration-black">Active Bounties</h2>
                       <div className="flex items-center gap-2 opacity-50 font-mono text-[10px] uppercase">
                         <Globe className="w-3 h-3" /> Base Network Live
                       </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="grid grid-cols-12 px-4 py-2 opacity-40 font-mono text-[10px] uppercase tracking-widest border-b border-black">
                        <div className="col-span-1">ID</div>
                        <div className="col-span-5">Task</div>
                        <div className="col-span-2">Reward</div>
                        <div className="col-span-2">Min RP</div>
                        <div className="col-span-2 text-right">Status</div>
                      </div>
                      {bounties.length === 0 ? (
                        <div className="p-12 text-center opacity-40 italic font-serif">No active bounties found in this sector...</div>
                      ) : (
                        bounties.map((b, idx) => (
                          <div key={b.id} className="data-row grid grid-cols-12 px-4 py-4 bg-white cursor-pointer items-center border border-black mb-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                            <div className="col-span-1 font-mono text-[10px] opacity-30">0{idx+1}</div>
                            <div className="col-span-5">
                              <h4 className="font-bold text-sm uppercase leading-tight">{b.title}</h4>
                              <p className="text-[10px] opacity-60 font-mono truncate">{b.description}</p>
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-1 font-mono font-black text-sm">
                                <Zap className="w-3 h-3 fill-yellow-400" />
                                {b.reward} ETH
                              </div>
                            </div>
                            <div className="col-span-2 font-mono text-xs text-center opacity-60">
                              {b.requiredReputation}
                            </div>
                            <div className="col-span-2 text-right">
                              <span className={cn(
                                "text-[9px] font-mono uppercase bg-black px-2 py-0.5 text-white italic",
                                b.status === 'open' ? "bg-black" : "bg-red-900"
                              )}>
                                {b.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.section>
                )}

                {view === 'create' && (
                  <motion.section 
                    key="create"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-black p-8 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                  >
                    <h2 className="font-mono font-black text-2xl uppercase mb-8 italic">New Protocol Bounty</h2>
                    <form onSubmit={createBounty} className="space-y-6">
                      <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase opacity-40 font-bold">Bounty Title</label>
                        <input name="title" required placeholder="e.g. Audit Smart Contract XYZ" className="w-full bg-[#E4E3E0] border border-black p-3 font-mono text-sm focus:outline-none focus:ring-1 ring-black" />
                      </div>
                      <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase opacity-40 font-bold">Mission Description</label>
                        <textarea name="description" required rows={4} placeholder="Detail the requirements and deliverables..." className="w-full bg-[#E4E3E0] border border-black p-3 font-mono text-sm focus:outline-none focus:ring-1 ring-black" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="font-mono text-[10px] uppercase opacity-40 font-bold">Reward (ETH)</label>
                          <input name="reward" type="number" step="0.001" required placeholder="0.01" className="w-full bg-[#E4E3E0] border border-black p-3 font-mono text-sm focus:outline-none focus:ring-1 ring-black" />
                        </div>
                        <div className="space-y-2">
                          <label className="font-mono text-[10px] uppercase opacity-40 font-bold">Required Reputation</label>
                          <input name="rep" type="number" required placeholder="50" defaultValue={50} className="w-full bg-[#E4E3E0] border border-black p-3 font-mono text-sm focus:outline-none focus:ring-1 ring-black" />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-black text-[#E4E3E0] p-4 font-mono font-black uppercase italic hover:scale-[1.01] transition-transform">
                        Broadcast Bounty to Network
                      </button>
                    </form>
                  </motion.section>
                )}

                {view === 'profile' && (
                  <motion.section 
                    key="profile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-8"
                  >
                    <div className="bg-white border border-black p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-32 h-32 border-r border-b border-black opacity-10 font-mono text-[80px] leading-none p-4 pointer-events-none">ID</div>
                      
                      <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-32 h-32 border-2 border-black p-1 bg-white shrink-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                          <img src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-4 text-center md:text-left flex-1">
                          {isEditingProfile ? (
                            <form onSubmit={saveProfile} className="space-y-3">
                              <div className="space-y-1">
                                <label className="font-mono text-[10px] uppercase opacity-40 font-bold">Display Name</label>
                                <input 
                                  value={editName} 
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-[#E4E3E0] border border-black p-2 font-mono text-xs focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-mono text-[10px] uppercase opacity-40 font-bold">Photo URL</label>
                                <input 
                                  value={editPhoto} 
                                  onChange={(e) => setEditPhoto(e.target.value)}
                                  className="w-full bg-[#E4E3E0] border border-black p-2 font-mono text-xs focus:outline-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" className="bg-black text-white px-4 py-1 font-mono text-[10px] uppercase font-bold">Save Changes</button>
                                <button type="button" onClick={() => setIsEditingProfile(false)} className="border border-black px-4 py-1 font-mono text-[10px] uppercase font-bold hover:bg-black/5">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-mono text-[10px] uppercase opacity-40">{user.email}</span>
                                    <h2 className="text-4xl font-black uppercase italic leading-none">{profile?.displayName}</h2>
                                  </div>
                                  <button 
                                    onClick={startEditing}
                                    className="p-1 border border-black hover:bg-black hover:text-white transition-colors"
                                    title="Edit Profile"
                                  >
                                    <PlusCircle className="w-4 h-4 rotate-45" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                <div className="border border-black px-3 py-1 bg-black text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1 italic">
                                  <Award className="w-3 h-3" /> Rank: {profile?.ethosStatus === 'none' ? 'INITIATE' : profile?.ethosStatus}
                                </div>
                                <div className="border border-black px-3 py-1 bg-white text-black text-[10px] font-mono font-bold uppercase flex items-center gap-1 italic">
                                  <Star className="w-3 h-3 fill-black" /> Rep: {profile?.reputationScore}
                                </div>
                                <button 
                                  onClick={togglePOH}
                                  className={cn(
                                    "border border-black px-3 py-1 text-[10px] font-mono font-bold uppercase flex items-center gap-1 italic transition-colors",
                                    profile?.pohVerified ? "bg-green-100" : "bg-red-100 hover:bg-green-200"
                                  )}
                                >
                                  <CheckCircle2 className="w-3 h-3" /> POH: {profile?.pohVerified ? "PASSED" : "FAILED / RETEST"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white border border-black p-6 space-y-4">
                        <h3 className="font-mono font-black uppercase italic border-b border-black pb-2 text-xs">Trust Signals (Ethos)</h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Network Age', value: profile?.joinedAt ? formatDistanceToNow(profile.joinedAt.toDate()) : '...', icon: Globe },
                            { label: 'Completed Jobs', value: '0', icon: CheckCircle2 },
                            { label: 'Attestations', value: '0', icon: ShieldCheck }
                          ].map((sig, i) => (
                             <div key={i} className="flex justify-between items-center py-2 border-b border-black/10">
                               <div className="flex items-center gap-2 opacity-60 font-mono text-[10px] uppercase font-bold">
                                 <sig.icon className="w-3 h-3" /> {sig.label}
                               </div>
                               <div className="font-mono text-[10px] uppercase font-black italic">{sig.value}</div>
                             </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border border-black p-6 space-y-4 flex flex-col justify-center items-center text-center opacity-40">
                         <Zap className="w-12 h-12 mb-2" />
                         <p className="font-mono text-xs uppercase leading-relaxed">
                           Stake Base ETH to increase <br /> priority and trust weight in <br /> future protocol governance.
                         </p>
                         <button disabled className="mt-4 border border-black px-6 py-2 text-[10px] font-mono uppercase font-bold">Coming Soon</button>
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-black p-12 mt-20 opacity-30 font-mono text-[10px] uppercase tracking-[0.2em] text-center space-y-4">
        <div className="flex justify-center gap-12">
           <span>Protocol: V1.0.4-BASE</span>
           <span>Status: Network Operational</span>
           <span>Latency: 12ms</span>
        </div>
        <p>© 2026 BaseTrust Reputation Network - Powered by BaseChain</p>
      </footer>
    </div>
  );
}
