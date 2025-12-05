import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

interface TermsAndConditionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[var(--color-tropical-dark)]/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-[var(--color-tropical-sand)] shadow-2xl border-4 border-[var(--color-tropical-gold)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gradient-to-r from-[var(--color-tropical-gold)]/20 to-[var(--color-tropical-orange)]/20 border-b-2 border-[var(--color-tropical-gold)]/30">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-[var(--color-tropical-gold)]" />
              <h2 className="text-2xl font-bold text-[var(--color-tropical-dark)]">
                Terms and Conditions
              </h2>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-full',
                'hover:bg-[var(--color-tropical-gold)]/20',
                'transition-colors duration-200',
                'text-[var(--color-tropical-dark)]'
              )}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6 md:p-8">
            <div className="space-y-6 text-[var(--color-tropical-dark)]">
              <div>
                <h3 className="text-xl font-bold mb-3 text-[var(--color-tropical-orange)]">
                  Last Updated: {new Date().toLocaleDateString()}
                </h3>
              </div>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
                <p className="text-sm leading-relaxed">
                  By accessing and using Muchas Radio, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">2. User-Generated Content Disclaimer</h3>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <p className="text-sm leading-relaxed font-medium text-red-800">
                    <strong>IMPORTANT DISCLAIMER:</strong> Muchas Radio is a collaborative platform where users can upload and share music content. The service provider operating Muchas Radio is <strong>NOT RESPONSIBLE</strong> for any content uploaded by users.
                  </p>
                </div>
                <p className="text-sm leading-relaxed">
                  Users are solely responsible for the content they upload, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed ml-4">
                  <li>Content that violates local laws and regulations</li>
                  <li>Content that infringes upon copyright, trademark, or other intellectual property rights</li>
                  <li>Content that is illegal, harmful, threatening, abusive, or otherwise objectionable</li>
                  <li>Content that violates privacy rights or contains personal information without consent</li>
                </ul>
                <p className="text-sm leading-relaxed mt-4">
                  By uploading content to Muchas Radio, you represent and warrant that you have all necessary rights, licenses, and permissions to upload and share such content, and that the content does not violate any laws or infringe upon any third-party rights.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">3. Copyright and Intellectual Property</h3>
                <p className="text-sm leading-relaxed">
                  Users must ensure that any content they upload does not infringe upon copyright, trademark, or other intellectual property rights. The service provider is not liable for any copyright infringement resulting from user-uploaded content. Users who upload copyrighted material without authorization may be subject to legal action by copyright holders.
                </p>
                <p className="text-sm leading-relaxed">
                  If you believe that content on Muchas Radio infringes your copyright, please contact the service provider with a detailed notice of the alleged infringement.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">4. User Conduct</h3>
                <p className="text-sm leading-relaxed">
                  Users agree to use Muchas Radio in a lawful manner and in accordance with all applicable local, state, national, and international laws and regulations. Users are prohibited from uploading content that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed ml-4">
                  <li>Violates any applicable laws or regulations</li>
                  <li>Infringes upon intellectual property rights</li>
                  <li>Contains hate speech, harassment, or discriminatory content</li>
                  <li>Is pornographic, obscene, or sexually explicit</li>
                  <li>Contains malware, viruses, or other harmful code</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">5. Limitation of Liability</h3>
                <p className="text-sm leading-relaxed">
                  The service provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use Muchas Radio, including but not limited to damages arising from user-uploaded content, copyright infringement claims, or violations of local laws.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">6. Indemnification</h3>
                <p className="text-sm leading-relaxed">
                  You agree to indemnify and hold harmless the service provider, its operators, and affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of Muchas Radio, your violation of these terms, or your infringement of any rights of another party.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">7. Content Removal</h3>
                <p className="text-sm leading-relaxed">
                  The service provider reserves the right, but not the obligation, to remove any content that violates these terms or is otherwise objectionable, without prior notice. The service provider may also suspend or terminate user access for violations of these terms.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">8. Changes to Terms</h3>
                <p className="text-sm leading-relaxed">
                  The service provider reserves the right to modify these terms at any time. Users will be notified of significant changes, and continued use of Muchas Radio after such changes constitutes acceptance of the modified terms.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold">9. Contact Information</h3>
                <p className="text-sm leading-relaxed">
                  If you have questions about these Terms and Conditions, please contact the service provider through the appropriate channels.
                </p>
              </section>

              <div className="pt-4 border-t-2 border-[var(--color-tropical-gold)]/30">
                <p className="text-xs text-[var(--color-text-muted)] italic">
                  By using Muchas Radio, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

