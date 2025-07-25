import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { toast, Toaster } from 'sonner';

const LoginPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;
            
            toast.success("Login successful! Redirecting to your lobby...");
            setTimeout(() => {
                navigate('/lobby');
            }, 1500);

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
                    <p className="text-muted-foreground mt-2">Welcome back! Please sign in to your account.</p>
                </div>

                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                            placeholder="••••••••"
                            required
                            onChange={handleChange}
                            value={formData.password}
                        />
                        <div className="pt-2">
                            <Button type="submit" className="w-full" size="lg" loading={loading}>
                                Sign In
                            </Button>
                        </div>
                    </form>
                </div>
                <div className="text-center mt-6 text-sm">
                    <p className="text-muted-foreground">
                        Don't have an account?{' '}
                        <Button variant="link" className="px-1" onClick={() => navigate('/signup')}>
                            Sign up here
                        </Button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;