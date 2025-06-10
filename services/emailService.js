const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@eventsphere.com',
            to: email,
            subject: 'Welcome to EventSphere!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Welcome to EventSphere, ${firstName}!</h2>
                    <p>Thank you for joining EventSphere, your premier platform for expo and trade show management.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Browse and register for upcoming expos</li>
                        <li>Apply as an exhibitor for events</li>
                        <li>Manage your profile and preferences</li>
                        <li>Connect with other attendees and exhibitors</li>
                    </ul>
                    <p>Get started by exploring our upcoming events!</p>
                    <a href="${process.env.FRONTEND_URL}/expos" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Browse Expos</a>
                    <p style="margin-top: 30px; color: #666;">
                        Best regards,<br>
                        The EventSphere Team
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw error;
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetUrl) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@eventsphere.com',
            to: email,
            subject: 'Reset Your EventSphere Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Password Reset Request</h2>
                    <p>Hi ${firstName},</p>
                    <p>We received a request to reset your password for your EventSphere account.</p>
                    <p>Click the button below to reset your password:</p>
                    <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
                    <p style="margin-top: 20px; color: #666;">
                        This link will expire in 10 minutes for security reasons.
                    </p>
                    <p style="color: #666;">
                        If you didn't request this password reset, please ignore this email.
                    </p>
                    <p style="margin-top: 30px; color: #666;">
                        Best regards,<br>
                        The EventSphere Team
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};

// Send exhibitor application status email
const sendExhibitorStatusEmail = async (email, firstName, expoTitle, status, notes = '') => {
    try {
        const transporter = createTransporter();
        
        const statusMessages = {
            approved: {
                subject: 'Exhibitor Application Approved!',
                title: 'Congratulations! Your application has been approved',
                color: '#059669',
                message: 'We are pleased to inform you that your exhibitor application has been approved.',
                action: 'View Dashboard',
                actionUrl: `${process.env.FRONTEND_URL}/exhibitor/dashboard`
            },
            rejected: {
                subject: 'Exhibitor Application Update',
                title: 'Application Status Update',
                color: '#dc2626',
                message: 'We regret to inform you that your exhibitor application was not approved at this time.',
                action: 'View Application',
                actionUrl: `${process.env.FRONTEND_URL}/exhibitor/applications`
            },
            waitlisted: {
                subject: 'Exhibitor Application Waitlisted',
                title: 'You have been added to the waitlist',
                color: '#d97706',
                message: 'Your application has been placed on our waitlist. We will notify you if a spot becomes available.',
                action: 'View Application',
                actionUrl: `${process.env.FRONTEND_URL}/exhibitor/applications`
            }
        };

        const statusInfo = statusMessages[status];
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@eventsphere.com',
            to: email,
            subject: statusInfo.subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${statusInfo.color};">${statusInfo.title}</h2>
                    <p>Hi ${firstName},</p>
                    <p>${statusInfo.message}</p>
                    <p><strong>Expo:</strong> ${expoTitle}</p>
                    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                    <a href="${statusInfo.actionUrl}" style="background-color: ${statusInfo.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">${statusInfo.action}</a>
                    <p style="margin-top: 30px; color: #666;">
                        Best regards,<br>
                        The EventSphere Team
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Exhibitor ${status} email sent successfully to:`, email);
    } catch (error) {
        console.error('Error sending exhibitor status email:', error);
        throw error;
    }
};

// Send expo registration confirmation
const sendRegistrationConfirmation = async (email, firstName, expoTitle, expoDate, ticketType) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@eventsphere.com',
            to: email,
            subject: `Registration Confirmed - ${expoTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Registration Confirmed!</h2>
                    <p>Hi ${firstName},</p>
                    <p>Your registration for <strong>${expoTitle}</strong> has been confirmed!</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Event Details</h3>
                        <p><strong>Event:</strong> ${expoTitle}</p>
                        <p><strong>Date:</strong> ${new Date(expoDate).toLocaleDateString()}</p>
                        <p><strong>Ticket Type:</strong> ${ticketType}</p>
                    </div>
                    <p>You will receive additional information about the event as the date approaches.</p>
                    <a href="${process.env.FRONTEND_URL}/attendee/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
                    <p style="margin-top: 30px; color: #666;">
                        Best regards,<br>
                        The EventSphere Team
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Registration confirmation email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending registration confirmation email:', error);
        throw error;
    }
};

// Send session reminder
const sendSessionReminder = async (email, firstName, sessionTitle, sessionDate, sessionTime, location) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@eventsphere.com',
            to: email,
            subject: `Reminder: ${sessionTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Session Reminder</h2>
                    <p>Hi ${firstName},</p>
                    <p>This is a reminder that you have registered for the following session:</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">${sessionTitle}</h3>
                        <p><strong>Date:</strong> ${new Date(sessionDate).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${sessionTime}</p>
                        <p><strong>Location:</strong> ${location}</p>
                    </div>
                    <p>Don't forget to attend! We look forward to seeing you there.</p>
                    <a href="${process.env.FRONTEND_URL}/attendee/sessions" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View My Sessions</a>
                    <p style="margin-top: 30px; color: #666;">
                        Best regards,<br>
                        The EventSphere Team
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Session reminder email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending session reminder email:', error);
        throw error;
    }
};

// Send booth assignment notification
const sendBoothAssignmentEmail = async (email, firstName, expoTitle, boothNumber, boothDetails) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@eventsphere.com',
            to: email,
            subject: `Booth Assignment - ${expoTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">Booth Assignment Confirmed!</h2>
                    <p>Hi ${firstName},</p>
                    <p>Great news! Your booth has been assigned for <strong>${expoTitle}</strong>.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Booth Details</h3>
                        <p><strong>Booth Number:</strong> ${boothNumber}</p>
                        <p><strong>Category:</strong> ${boothDetails.category || 'Standard'}</p>
                        <p><strong>Size:</strong> ${boothDetails.size || 'Standard'}</p>
                    </div>
                    <p>You can now start planning your booth setup and preparing for the event.</p>
                    <a href="${process.env.FRONTEND_URL}/exhibitor/booth" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Booth Details</a>
                    <p style="margin-top: 30px; color: #666;">
                        Best regards,<br>
                        The EventSphere Team
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Booth assignment email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending booth assignment email:', error);
        throw error;
    }
};

// Send feedback response notification
const sendFeedbackResponseEmail = async (email, firstName, subject, responseMessage) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@eventsphere.com',
            to: email,
            subject: `Response to your feedback: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Response to Your Feedback</h2>
                    <p>Hi ${firstName},</p>
                    <p>We have responded to your feedback regarding: <strong>${subject}</strong></p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Our Response</h3>
                        <p>${responseMessage}</p>
                    </div>
                    <p>Thank you for your feedback. It helps us improve our services.</p>
                    <a href="${process.env.FRONTEND_URL}/feedback" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Feedback</a>
                    <p style="margin-top: 30px; color: #666;">
                        Best regards,<br>
                        The EventSphere Team
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Feedback response email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending feedback response email:', error);
        throw error;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendExhibitorStatusEmail,
    sendRegistrationConfirmation,
    sendSessionReminder,
    sendBoothAssignmentEmail,
    sendFeedbackResponseEmail
}; 