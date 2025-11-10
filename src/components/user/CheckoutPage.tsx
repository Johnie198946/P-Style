import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  CreditCard,
  MessageCircle,
  Wallet,
  Lock,
  ArrowLeft,
  Tag,
  AlertCircle,
  CheckCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { subscriptionStore, SubscriptionPlan } from '../../lib/subscriptionStore';
import { paymentStore, PaymentMethodConfig } from '../../lib/paymentStore';

interface CheckoutPageProps {
  planId?: string;
  onBack?: () => void;
  onSuccess?: (orderId: string) => void;
}

export function CheckoutPage({ planId = 'pro', onBack, onSuccess }: CheckoutPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('wechat');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: 'percent' | 'fixed';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const plan = subscriptionStore.getPlanById(planId);
    setSelectedPlan(plan);
    setPaymentMethods(paymentStore.getEnabledPaymentMethods());
  }, [planId]);

  const handleApplyCoupon = () => {
    // 模拟优惠码验证
    const mockCoupons: Record<string, { discount: number; type: 'percent' | 'fixed' }> = {
      LAUNCH100: { discount: 100, type: 'fixed' },
      SAVE20: { discount: 20, type: 'percent' },
      WELCOME50: { discount: 50, type: 'fixed' },
    };

    const coupon = mockCoupons[couponCode.toUpperCase()];
    if (coupon) {
      setAppliedCoupon({ code: couponCode.toUpperCase(), ...coupon });
    } else {
      alert('优惠码无效或已过期');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    let total = selectedPlan.price;

    if (appliedCoupon) {
      if (appliedCoupon.type === 'fixed') {
        total = Math.max(0, total - appliedCoupon.discount);
      } else {
        total = total * (1 - appliedCoupon.discount / 100);
      }
    }

    return total;
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);

    // 创建订单
    const order = paymentStore.createOrder({
      userId: 'user_current',
      userName: '当前用户',
      userEmail: 'user@example.com',
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      amount: calculateTotal(),
      originalAmount: selectedPlan.price,
      discountAmount: appliedCoupon
        ? selectedPlan.price - calculateTotal()
        : undefined,
      couponCode: appliedCoupon?.code,
      paymentMethod: selectedMethod as any,
      paymentMethodDisplay:
        paymentMethods.find(m => m.id === selectedMethod)?.name || '',
    });

    // 模拟支付处理
    setTimeout(() => {
      // 模拟支付成功
      paymentStore.updateOrderStatus(
        order.id,
        'completed',
        `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`
      );
      setOrderId(order.id);
      setIsProcessing(false);
      setShowSuccess(true);

      // 3秒后回调
      setTimeout(() => {
        onSuccess?.(order.id);
      }, 3000);
    }, 2000);
  };

  const getMethodIcon = (methodId: string) => {
    const icons: Record<string, any> = {
      wechat: MessageCircle,
      alipay: CreditCard,
      creditcard: CreditCard,
      paypal: Wallet,
    };
    const Icon = icons[methodId] || CreditCard;
    return Icon;
  };

  if (!selectedPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>返回</span>
            </button>
          )}
          <h1 className="text-gray-900 mb-2" style={{ fontSize: '32px', fontWeight: 700 }}>
            完成订阅
          </h1>
          <p className="text-gray-600" style={{ fontSize: '16px', fontWeight: 400 }}>
            选择支付方式，开始你的 {selectedPlan.name} 之旅
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Payment Methods */}
            <Card className="border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-gray-900 mb-4" style={{ fontSize: '18px', fontWeight: 600 }}>
                  选择支付方式
                </h3>
                <div className="space-y-3">
                  {paymentMethods.map((method, index) => {
                    const Icon = getMethodIcon(method.id);
                    return (
                      <motion.button
                        key={method.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          selectedMethod === method.id
                            ? 'border-blue-500 bg-blue-50/50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                selectedMethod === method.id
                                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <p
                                className="text-gray-900"
                                style={{ fontSize: '16px', fontWeight: 600 }}
                              >
                                {method.name}
                              </p>
                              <p className="text-gray-500" style={{ fontSize: '13px' }}>
                                {method.description}
                              </p>
                            </div>
                          </div>
                          {selectedMethod === method.id && (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Coupon Code */}
            <Card className="border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-gray-900 mb-4" style={{ fontSize: '18px', fontWeight: 600 }}>
                  优惠码
                </h3>
                {appliedCoupon ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-green-50 border-2 border-green-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-green-900" style={{ fontSize: '14px', fontWeight: 600 }}>
                            优惠码已应用
                          </p>
                          <p className="text-green-700" style={{ fontSize: '13px' }}>
                            {appliedCoupon.code} -{' '}
                            {appliedCoupon.type === 'fixed'
                              ? `¥${appliedCoupon.discount}`
                              : `${appliedCoupon.discount}%`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-green-700" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="输入优惠码"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={!couponCode}
                      variant="outline"
                      className="border-gray-300"
                    >
                      应用
                    </Button>
                  </div>
                )}
                <div className="mt-3 flex items-start gap-2 text-gray-500" style={{ fontSize: '12px' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>试试这些优惠码: LAUNCH100, SAVE20, WELCOME50</p>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl"
            >
              <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-blue-900" style={{ fontSize: '13px' }}>
                您的支付信息已通过 256 位 SSL 加密保护
              </p>
            </motion.div>
          </motion.div>

          {/* Right Column - Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-6">
              <Card className="border-gray-200 shadow-xl">
                <CardContent className="p-6">
                  <h3 className="text-gray-900 mb-6" style={{ fontSize: '18px', fontWeight: 600 }}>
                    订单摘要
                  </h3>

                  {/* Plan Info */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl mb-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${selectedPlan.color} flex items-center justify-center text-white`}
                      >
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                          {selectedPlan.name}
                        </h4>
                        <p className="text-gray-600" style={{ fontSize: '13px' }}>
                          {selectedPlan.description}
                        </p>
                      </div>
                    </div>
                    {selectedPlan.popular && (
                      <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
                        最受欢迎
                      </Badge>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {selectedPlan.features
                      .filter(f => f.enabled)
                      .slice(0, 5)
                      .map(feature => (
                        <div key={feature.id} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700" style={{ fontSize: '13px' }}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                  </div>

                  <Separator className="my-6" />

                  {/* Pricing Breakdown */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600" style={{ fontSize: '14px' }}>
                        {selectedPlan.name}
                      </span>
                      <span className="text-gray-900" style={{ fontSize: '14px', fontWeight: 600 }}>
                        ¥{selectedPlan.price}
                      </span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-green-600">
                        <span style={{ fontSize: '14px' }}>优惠码 ({appliedCoupon.code})</span>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>
                          -¥{(selectedPlan.price - calculateTotal()).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                        总计
                      </span>
                      <span className="text-gray-900" style={{ fontSize: '24px', fontWeight: 700 }}>
                        ¥{calculateTotal().toFixed(2)}
                      </span>
                    </div>

                    <p className="text-gray-500 text-center" style={{ fontSize: '12px' }}>
                      按{selectedPlan.periodDisplay}计费
                    </p>
                  </div>

                  {/* Payment Button */}
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                    style={{ fontSize: '16px', fontWeight: 600 }}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>处理中...</span>
                      </div>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        立即支付 ¥{calculateTotal().toFixed(2)}
                      </>
                    )}
                  </Button>

                  <p className="text-gray-500 text-center mt-4" style={{ fontSize: '12px' }}>
                    点击支付即表示您同意我们的服务条款和隐私政策
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            />
            <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-8 text-center">
                  {/* Success Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Success Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-gray-900 mb-2" style={{ fontSize: '24px', fontWeight: 700 }}>
                      支付成功！
                    </h3>
                    <p className="text-gray-600 mb-6" style={{ fontSize: '14px' }}>
                      恭喜！你已成功订阅 {selectedPlan.name}
                    </p>

                    <div className="p-4 bg-gray-50 rounded-xl mb-6 text-left">
                      <div className="space-y-2 text-gray-700" style={{ fontSize: '13px' }}>
                        <div className="flex justify-between">
                          <span>订单号：</span>
                          <span className="font-mono">{orderId.slice(0, 20)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span>支付金额：</span>
                          <span style={{ fontWeight: 600 }}>¥{calculateTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>订阅计划：</span>
                          <span style={{ fontWeight: 600 }}>{selectedPlan.name}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-500" style={{ fontSize: '12px' }}>
                      正在跳转到个人中心...
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Processing Overlay */}
      {isProcessing && !showSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center"
        >
          <Card className="border-gray-200 shadow-2xl">
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full"
              />
              <p className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                正在处理支付...
              </p>
              <p className="text-gray-500 mt-2" style={{ fontSize: '13px' }}>
                请勿关闭页面
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
