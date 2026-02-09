interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      <p className="font-medium">エラーが発生しました</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
}
