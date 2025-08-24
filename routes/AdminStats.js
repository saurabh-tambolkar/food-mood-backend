const express = require("express");
const Orders = require("../models/UserOrders");
const router = express.Router();

router.get("/get-order-counts", async (req, res) => {
  try {
      const { startDate, endDate } = req.query;
    const allStatuses = ["Pending", "Processing", "Completed", "Cancelled"]; // add any other statuses here
      const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const ordersCount = await Orders.aggregate([
        {
            $match:matchStage
        },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert aggregation array to object: { Completed: 2, Cancelled: 1 }
    const countMap = {};
    ordersCount.forEach(item => {
      countMap[item._id] = item.count;
    });

    // Ensure all statuses are included
    const finalCounts = {};
    allStatuses.forEach(status => {
      finalCounts[status] = countMap[status] || 0;
    });

    res.status(200).json({
      message: "Order count fetched successfully!",
      count: finalCounts,
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({
      message: "Can't find orders for this order status right now!",
      success: false,
    });
  }
});





module.exports = router;
