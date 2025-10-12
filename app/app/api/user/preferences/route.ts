
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        defaultFulfillmentType: true,
        defaultWillingToShip: true,
        defaultOkForLocals: true,
        defaultLocation: true,
        defaultMeetupPreference: true,
        defaultWeight: true,
        defaultDimensions: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      fullName,
      defaultFulfillmentType,
      defaultWillingToShip,
      defaultOkForLocals,
      defaultLocation,
      defaultMeetupPreference,
      defaultWeight,
      defaultDimensions,
    } = body;

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        ...(fullName !== undefined && { fullName }),
        ...(defaultFulfillmentType !== undefined && { defaultFulfillmentType }),
        ...(defaultWillingToShip !== undefined && { defaultWillingToShip }),
        ...(defaultOkForLocals !== undefined && { defaultOkForLocals }),
        ...(defaultLocation !== undefined && { defaultLocation }),
        ...(defaultMeetupPreference !== undefined && { defaultMeetupPreference }),
        ...(defaultWeight !== undefined && { defaultWeight }),
        ...(defaultDimensions !== undefined && { defaultDimensions }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        defaultFulfillmentType: true,
        defaultWillingToShip: true,
        defaultOkForLocals: true,
        defaultLocation: true,
        defaultMeetupPreference: true,
        defaultWeight: true,
        defaultDimensions: true,
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
