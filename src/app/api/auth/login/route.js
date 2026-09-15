import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { password } = body;
    const email = body.email?.toLowerCase().trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { email }
    });

    // Auto-seed default users if they don't exist in the database yet
    if (!user) {
      if (email === 'nikhil@aidigital.com') {
        const salt = await bcrypt.genSalt(10);
        const ceoHash = await bcrypt.hash("AiDigitals@246", salt);
        user = await prisma.user.create({
          data: {
            email: 'nikhil@aidigital.com',
            password: ceoHash,
            name: 'John Doe',
            role: 'CEO',
            department: 'Executive',
            salary: 250000,
            status: 'ACTIVE',
            avatar: '👨‍💼'
          }
        });
      } else if (email === 'praveen@aidigital.com' || email === 'admin@workforce.com') {
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash("Admin@#123", salt);
        user = await prisma.user.create({
          data: {
            email: email,
            password: adminHash,
            name: 'Business Head',
            role: 'ADMIN',
            department: 'HR',
            salary: 95000,
            status: 'ACTIVE',
            avatar: '👨‍💼'
          }
        });
      } else if (email === 'tl@workforce.com') {
        const salt = await bcrypt.genSalt(10);
        const tlHash = await bcrypt.hash("tl123", salt);
        user = await prisma.user.create({
          data: {
            email: 'tl@workforce.com',
            password: tlHash,
            name: 'Team Lead',
            role: 'TL',
            department: 'Content',
            salary: 80000,
            status: 'ACTIVE',
            avatar: '👨‍💼'
          }
        });
      } else if (email === 'employee@workforce.com') {
        const salt = await bcrypt.genSalt(10);
        const empHash = await bcrypt.hash("emp123", salt);
        user = await prisma.user.create({
          data: {
            email: 'employee@workforce.com',
            password: empHash,
            name: 'Bob Johnson',
            role: 'EMPLOYEE',
            department: 'Software Development',
            salary: 75000,
            status: 'ACTIVE',
            avatar: '👨‍💻'
          }
        });
      } else {
        // Auto-seed real employee accounts from the seed-employees list
        const employeesList = [
          { name: 'Danish Khan', department: 'Graphic Designer', password: 'Danish@Ai123', email: 'danish@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Harshit Gajbhiye', department: 'Social Media Executive', password: 'Harshit@Ai456', email: 'harshit@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Divyansh', department: 'Ai Video Editor', password: 'Divyansh@Ai546', email: 'divyansh@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Nouman', department: 'Ai Video Editor', password: 'Nouman@Ai645', email: 'nouman@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Masoom', department: 'Ai Video Editor', password: 'Masoom@Ai564', email: 'masoom@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Rama', department: 'Digital Marketing Executive', password: 'Rama@Ai789', email: 'rama@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Pujan', department: 'Digital Marketing Executive', password: 'Pujan@Ai879', email: 'pujan@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Preet', department: 'Digital Marketing Executive', password: 'Preet@Ai978', email: 'preet@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Sanmeet', department: 'Video Editor', password: 'Sanmeet@Ai901', email: 'sanmeet@aidigital.com', role: 'EMPLOYEE' },
          { name: 'Jennifer', department: 'Sales Executive', password: 'Jennifer@Ai123', email: 'jennifer@aidigital.com', role: 'SALES' }
        ];

        const emp = employeesList.find(e => e.email === email);
        if (emp) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(emp.password, salt);
          user = await prisma.user.create({
            data: {
              email: emp.email,
              password: hashedPassword,
              name: emp.name,
              role: emp.role,
              department: emp.department,
              salary: 40000,
              status: 'ACTIVE',
              avatar: emp.role === 'TL' ? '👨‍💼' : '👤'
            }
          });
        }
      }
    } else {
      // If user exists, ensure Jennifer has the SALES role
      if (email === 'jennifer@aidigital.com' && user.role !== 'SALES') {
        user = await prisma.user.update({
          where: { email },
          data: { role: 'SALES' }
        });
      }
    }

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Set cookie
    const cookieStore = await cookies();
    if (user.role === 'CLIENT') {
      cookieStore.set('clientId', user.department, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/'
      });
      cookieStore.delete('userId');
    } else {
      cookieStore.set('userId', user.id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/'
      });
      cookieStore.delete('clientId');
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: `${user.name} logged in`,
        performedByName: user.name,
        performedByRole: user.role
      }
    });

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
