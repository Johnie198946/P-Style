import React, { useState, useEffect } from 'react';
import { 
    CreditCard, Trash2, Plus, Smartphone, Globe, Check, 
    MoreHorizontal, X, QrCode, Loader2, ShieldCheck, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'motion/react';

// --- TYPES ---
type PaymentType = 'card' | 'alipay' | 'wechat' | 'paypal';

interface PaymentMethod {
    id: string;
    type: PaymentType;
    details: {
        last4?: string;
        brand?: string; // 'visa', 'mastercard', 'amex'
        expiry?: string;
        name?: string;
        email?: string; // for paypal
        phone?: string; // for alipay
    };
    isDefault: boolean;
}

// --- MOCK DATA ---
const INITIAL_METHODS: PaymentMethod[] = [
    {
        id: 'pm_1',
        type: 'card',
        details: { last4: '4242', brand: 'Visa', expiry: '12/28', name: 'Aris Thorne' },
        isDefault: true
    },
    {
        id: 'pm_2',
        type: 'alipay',
        details: { phone: '138****8888' },
        isDefault: false
    }
];

export const BillingSettings = () => {
    const { t } = useLanguage();
    const [methods, setMethods] = useState<PaymentMethod[]>(INITIAL_METHODS);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<PaymentType>('card');
    
    // Add Form State
    const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvc: '', name: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanStep, setScanStep] = useState<'qr' | 'scanning' | 'success'>('qr');
    
    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ expiry: '', name: '' });

    // --- HANDLERS ---

    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        
        // Simulate API
        setTimeout(() => {
            const newMethod: PaymentMethod = {
                id: `pm_${Date.now()}`,
                type: 'card',
                details: {
                    last4: cardForm.number.slice(-4) || '8888',
                    brand: 'MasterCard',
                    expiry: cardForm.expiry,
                    name: cardForm.name
                },
                isDefault: methods.length === 0
            };
            setMethods([...methods, newMethod]);
            setIsProcessing(false);
            setIsAddOpen(false);
            setCardForm({ number: '', expiry: '', cvc: '', name: '' });
            toast.success(t('billing.bind_success'));
        }, 1500);
    };

    const handleSimulateScan = () => {
        setScanStep('scanning');
        setTimeout(() => {
            setScanStep('success');
            setTimeout(() => {
                const newMethod: PaymentMethod = {
                    id: `pm_${Date.now()}`,
                    type: activeTab,
                    details: { phone: '139****9999' }, // Mock
                    isDefault: methods.length === 0
                };
                setMethods([...methods, newMethod]);
                setIsAddOpen(false);
                setScanStep('qr');
                toast.success(t('billing.bind_success'));
            }, 1000);
        }, 2000);
    };

    const handleConnectPaypal = () => {
        setIsProcessing(true);
        setTimeout(() => {
            const newMethod: PaymentMethod = {
                id: `pm_${Date.now()}`,
                type: 'paypal',
                details: { email: 'aris.thorne@lab.io' }, 
                isDefault: methods.length === 0
            };
            setMethods([...methods, newMethod]);
            setIsProcessing(false);
            setIsAddOpen(false);
            toast.success(t('billing.bind_success'));
        }, 2000);
    };

    const handleRemove = (id: string) => {
        setMethods(methods.filter(m => m.id !== id));
        toast.info("Payment Method Removed");
    };

    const handleSetDefault = (id: string) => {
        setMethods(methods.map(m => ({
            ...m,
            isDefault: m.id === id
        })));
        toast.success("Default Payment Method Updated");
    };

    const startEdit = (method: PaymentMethod) => {
        if (method.type !== 'card') return;
        setEditingId(method.id);
        setEditForm({
            expiry: method.details.expiry || '',
            name: method.details.name || ''
        });
    };

    const saveEdit = () => {
        if (!editingId) return;
        setMethods(methods.map(m => m.id === editingId ? {
            ...m,
            details: { ...m.details, expiry: editForm.expiry, name: editForm.name }
        } : m));
        setEditingId(null);
        toast.success(t('billing.update_success'));
    };

    // --- RENDER HELPERS ---

    const getIcon = (type: PaymentType) => {
        switch (type) {
            case 'card': return <CreditCard className="w-5 h-5" />;
            case 'alipay': return <Smartphone className="w-5 h-5 text-blue-400" />;
            case 'wechat': return <Smartphone className="w-5 h-5 text-green-400" />;
            case 'paypal': return <Globe className="w-5 h-5 text-indigo-400" />;
        }
    };

    const getLabel = (method: PaymentMethod) => {
        switch (method.type) {
            case 'card': return `${method.details.brand} •••• ${method.details.last4}`;
            case 'alipay': return `Alipay (${method.details.phone})`;
            case 'wechat': return `WeChat Pay`;
            case 'paypal': return `PayPal (${method.details.email})`;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            
            {/* LIST SECTION */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-widest font-bold">{t('billing.payment_methods')}</h3>
                    <button 
                        onClick={() => setIsAddOpen(true)}
                        className="text-xs flex items-center gap-2 text-optic-accent hover:text-white transition-colors"
                    >
                        <Plus className="w-3 h-3" /> {t('billing.add_method')}
                    </button>
                </div>

                {methods.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-lg text-center text-gray-500 text-xs">
                        {t('billing.no_methods')}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {methods.map(method => (
                            <div 
                                key={method.id} 
                                className={`
                                    relative group p-5 rounded-xl border transition-all duration-300
                                    ${method.isDefault 
                                        ? 'bg-gradient-to-r from-optic-accent/10 to-transparent border-optic-accent/30 shadow-[0_0_20px_rgba(0,122,255,0.1)]' 
                                        : 'bg-white/5 border-white/5 hover:border-white/20'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${method.isDefault ? 'bg-optic-accent/20 text-optic-accent' : 'bg-black/50 text-gray-400'}`}>
                                            {getIcon(method.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-white font-medium font-mono">{getLabel(method)}</h4>
                                                {method.isDefault && (
                                                    <span className="text-[9px] bg-optic-accent text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
                                                        {t('billing.primary')}
                                                    </span>
                                                )}
                                            </div>
                                            {method.type === 'card' && (
                                                <div className="text-xs text-gray-500 mt-1 flex gap-4">
                                                    <span>{t('billing.exp_label')}: {method.details.expiry}</span>
                                                    <span>{method.details.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!method.isDefault && (
                                            <Button variant="ghost" size="sm" onClick={() => handleSetDefault(method.id)} className="text-[10px] h-7 text-gray-400 hover:text-white">
                                                {t('billing.set_default')}
                                            </Button>
                                        )}
                                        {method.type === 'card' && (
                                            <Button variant="ghost" size="sm" onClick={() => startEdit(method)} className="text-[10px] h-7 text-optic-accent hover:text-white">
                                                Edit
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => handleRemove(method.id)} className="text-[10px] h-7 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                            {t('billing.remove')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ADD METHOD MODAL */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-carbon-900 border-white/10 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-display tracking-wider text-lg">{t('billing.add_method')}</DialogTitle>
                    </DialogHeader>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-lg">
                        {['card', 'alipay', 'paypal'].map((type) => (
                            <button
                                key={type}
                                onClick={() => { setActiveTab(type as PaymentType); setScanStep('qr'); }}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${activeTab === type ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {type === 'card' ? t('billing.tab_card') : type === 'alipay' ? t('billing.tab_alipay') : t('billing.tab_paypal')}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[300px]">
                        <AnimatePresence mode="wait">
                            {/* CARD FORM */}
                            {activeTab === 'card' && (
                                <motion.form 
                                    key="card"
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleAddCard} 
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase text-gray-500 font-bold">{t('billing.card_number')}</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                            <Input 
                                                value={cardForm.number}
                                                onChange={e => setCardForm({...cardForm, number: e.target.value})}
                                                placeholder="0000 0000 0000 0000" 
                                                className="pl-10 font-mono bg-black/20 border-white/10 text-white" 
                                                maxLength={19}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase text-gray-500 font-bold">{t('billing.expiry')}</label>
                                            <Input 
                                                value={cardForm.expiry}
                                                onChange={e => setCardForm({...cardForm, expiry: e.target.value})}
                                                placeholder="MM/YY" 
                                                className="font-mono bg-black/20 border-white/10 text-white" 
                                                maxLength={5}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase text-gray-500 font-bold">{t('billing.cvv')}</label>
                                            <Input 
                                                value={cardForm.cvc}
                                                onChange={e => setCardForm({...cardForm, cvc: e.target.value})}
                                                type="password"
                                                placeholder="123" 
                                                className="font-mono bg-black/20 border-white/10 text-white" 
                                                maxLength={4}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase text-gray-500 font-bold">{t('billing.cardholder')}</label>
                                        <Input 
                                            value={cardForm.name}
                                            onChange={e => setCardForm({...cardForm, name: e.target.value})}
                                            placeholder={t('billing.placeholder_name')} 
                                            className="uppercase font-mono bg-black/20 border-white/10 text-white" 
                                            required
                                        />
                                    </div>
                                    
                                    <Button type="submit" disabled={isProcessing} className="w-full mt-4 bg-optic-accent text-white hover:bg-optic-accent/90">
                                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('billing.add_method')}
                                    </Button>
                                </motion.form>
                            )}

                            {/* ALIPAY QR */}
                            {(activeTab === 'alipay' || activeTab === 'wechat') && (
                                <motion.div
                                    key="qr"
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col items-center justify-center h-full py-8 text-center"
                                >
                                    {scanStep === 'qr' && (
                                        <>
                                            <div className="relative group cursor-pointer" onClick={handleSimulateScan}>
                                                <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(0,122,255,0.2)] mb-4">
                                                     <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BindPaymentMethod" alt="QR" className="w-48 h-48 mix-blend-multiply opacity-90" />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl">
                                                    <span className="text-white font-bold text-xs">{t('billing.click_scan')}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-white font-medium mb-2">{t('billing.scan_qr')}</p>
                                            <p className="text-xs text-gray-500 max-w-xs">{t('billing.scan_instruction')}</p>
                                        </>
                                    )}

                                    {scanStep === 'scanning' && (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-12 h-12 text-optic-accent animate-spin" />
                                            <p className="text-sm text-optic-accent animate-pulse">{t('billing.simulating_scan')}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* PAYPAL */}
                            {activeTab === 'paypal' && (
                                <motion.div
                                    key="paypal"
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                    className="flex flex-col items-center justify-center h-full py-12 space-y-6"
                                >
                                    <div className="w-20 h-20 bg-[#00457C] rounded-full flex items-center justify-center shadow-lg">
                                        <Globe className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h4 className="text-lg font-bold text-white mb-2">{t('billing.paypal_title')}</h4>
                                        <p className="text-xs text-gray-400 max-w-xs mx-auto">{t('billing.paypal_desc')}</p>
                                    </div>
                                    <Button 
                                        onClick={handleConnectPaypal} 
                                        disabled={isProcessing}
                                        className="bg-[#0070BA] hover:bg-[#005ea6] text-white min-w-[200px]"
                                    >
                                        {isProcessing ? (
                                            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('billing.connecting')}</span>
                                        ) : (
                                            <span className="flex items-center gap-2">{t('billing.connect_paypal')} <ExternalLink className="w-3 h-3" /></span>
                                        )}
                                    </Button>
                                    {isProcessing && (
                                        <p className="text-[10px] text-optic-accent animate-pulse">{t('billing.simulating_redirect')}</p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </DialogContent>
            </Dialog>

            {/* EDIT CARD DIALOG */}
            <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
                <DialogContent className="bg-carbon-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>{t('billing.edit_card')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase text-gray-500 font-bold">{t('billing.expiry')}</label>
                            <Input 
                                value={editForm.expiry}
                                onChange={e => setEditForm({...editForm, expiry: e.target.value})}
                                className="bg-black/20 border-white/10 text-white font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase text-gray-500 font-bold">{t('billing.cardholder')}</label>
                            <Input 
                                value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                className="bg-black/20 border-white/10 text-white font-mono uppercase"
                            />
                        </div>
                        <Button onClick={saveEdit} className="w-full bg-optic-accent text-white hover:bg-optic-accent/90">
                            {t('billing.update_btn')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};