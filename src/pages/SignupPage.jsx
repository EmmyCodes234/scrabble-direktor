import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { toast, Toaster } from 'sonner';

const SignupPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                    }
                }
            });

            if (error) throw error;
            
            toast.success("Account created successfully! Please check your email to verify your account and then log in.");
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Toaster position="top-center" richColors />
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-heading font-bold text-gradient cursor-pointer" onClick={() => navigate('/')}>
                        Direktor
                    </h1>
                    <p className="text-muted-foreground mt-2">Create an account to start managing tournaments.</p>
                </div>

                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Full Name"
                            name="fullName"
                            type="text"
                            placeholder="Enter your full name"
                            required
                            onChange={handleChange}
                            value={formData.fullName}
                        />
                        <Input
                            label="Email Address"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            onChange={handleChange}
                            value={formData.email}
                        />
                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            placeholder="Create a strong password (min. 6 characters)"
                            required
                            onChange={handleChange}
                            value={formData.password}
                        />
                        <div className="pt-2">
                            <Button type="submit" className="w-full" size="lg" loading={loading}>
                                Create Account
                            </Button>
                        </div>
                    </form>
                </div>
                <div className="text-center mt-6 text-sm">
                    <p className="text-muted-foreground">
                        Already have an account?{' '}
                        <Button variant="link" className="px-1" onClick={() => navigate('/login')}>
                            Sign in here
                        </Button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default SignupPage;