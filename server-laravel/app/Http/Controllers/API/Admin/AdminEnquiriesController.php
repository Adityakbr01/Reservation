<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use Illuminate\Http\Request;

class AdminEnquiriesController extends Controller
{
    private function formatEnquiry(Enquiry $e): array
    {
        return [
            'id' => $e->id,
            'title' => $e->title,
            'firstName' => $e->first_name,
            'first_name' => $e->first_name,
            'lastName' => $e->last_name,
            'last_name' => $e->last_name,
            'email' => $e->email,
            'telephone' => $e->telephone,
            'holidayBudget' => $e->holiday_budget,
            'partySize' => $e->party_size,
            'bedrooms' => $e->bedrooms,
            'fromDate' => $e->from_date,
            'toDate' => $e->to_date,
            'specificLocation' => $e->specific_location,
            'dogFriendly' => (bool) $e->dog_friendly,
            'details' => $e->details,
            'roomTypeId' => $e->room_type_id,
            'cottageId' => $e->room_type_id,
            'status' => $e->status ?? 'NEW',
            'createdAt' => $e->created_at?->toIso8601String(),
            'created_at' => $e->created_at?->toIso8601String(),
        ];
    }

    public function index(Request $request)
    {
        $query = Enquiry::query();

        if ($request->filled('q')) {
            $q = trim($request->input('q'));
            $query->where(function ($w) use ($q) {
                $w->where('first_name', 'like', "%{$q}%")
                  ->orWhere('last_name', 'like', "%{$q}%")
                  ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $items = $query->orderBy('created_at', 'desc')->paginate($request->input('limit', 50));

        return response()->json([
            'success' => true,
            'data' => array_map(fn ($e) => $this->formatEnquiry($e), $items->items()),
            'pagination' => [
                'total' => $items->total(),
                'page' => $items->currentPage(),
                'limit' => $items->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $enquiry = Enquiry::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->formatEnquiry($enquiry),
        ]);
    }

    public function update(Request $request, $id)
    {
        $enquiry = Enquiry::findOrFail($id);
        if ($request->has('status')) {
            $enquiry->status = $request->input('status');
        }
        $enquiry->save();

        return response()->json([
            'success' => true,
            'message' => 'Enquiry updated successfully',
            'data' => $this->formatEnquiry($enquiry),
        ]);
    }

    public function destroy($id)
    {
        $enquiry = Enquiry::findOrFail($id);
        $enquiry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Enquiry deleted successfully',
        ]);
    }
}
