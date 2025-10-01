
import { SignUpForm } from './_components/signup-form';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">Gist List</h1>
          <p className="text-gray-600">Start listing in seconds</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
