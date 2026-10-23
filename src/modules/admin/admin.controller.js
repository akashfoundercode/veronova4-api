"use strict";

const { AdminService } = require("./admin.service");
const AppError = require("../../shared/errors/AppError");

const service = new AdminService();

async function dashboard(req, res) {
  try {
    const period = req.query.period ?? "7d";
    const data = await service.getDashboard(period);
    return res.status(200).json({
      status: 200,
      message: "Dashboard data found",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function dashboardCounts(req, res) {
  try {
    const data = await service.getDashboardCounts();
    return res.status(200).json({
      status: 200,
      message: "Dashboard counts found",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getPlayers(req, res) {
  try {
    const data = await service.getPlayers(req.query);
    return res.status(200).json({
      status: 200,
      message: "Player directory fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getPlayerById(req, res) {
  try {
    const data = await service.getPlayerById(req.params.id);
    return res.status(200).json({
      status: 200,
      message: "Player details fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function updatePlayerStatus(req, res) {
  try {
    const targetId = req.params?.id ?? req.body?.id ?? req.body?.player_id;
    if (!targetId) {
      throw new AppError(400, "VALIDATION_ERROR", "Player ID is required");
    }
    let targetStatus = req.body?.status;
    if (req.body?.action === "suspend") targetStatus = 0;
    if (req.body?.action === "unsuspend") targetStatus = 1;
    if (targetStatus === undefined) {
      throw new AppError(400, "VALIDATION_ERROR", "status or action (suspend/unsuspend) is required");
    }
    const data = await service.setPlayerStatus(targetId, targetStatus);
    return res.status(200).json({
      status: 200,
      message: data.message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function suspendPlayer(req, res) {
  try {
    const data = await service.setPlayerStatus(req.params.id, 0);
    return res.status(200).json({
      status: 200,
      message: data.message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function unsuspendPlayer(req, res) {
  try {
    const data = await service.setPlayerStatus(req.params.id, 1);
    return res.status(200).json({
      status: 200,
      message: data.message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function addPlayer(req, res) {
  try {
    const data = await service.addPlayer(req.body);
    return res.status(201).json({
      status: 201,
      message: "Player created successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function quickAddPlayer(req, res) {
  try {
    const data = await service.quickAddPlayer(req.body);
    return res.status(201).json({
      status: 201,
      message: "Quick player created successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getAttendance(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id,
    };
    const data = await service.getAttendance(query);
    return res.status(200).json({
      status: 200,
      message: "Attendance data fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveAttendance(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    const result = await service.saveAttendance(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function transferFund(req, res) {
  try {
    const adminId = req.user?.id ?? 1;
    const data = await service.transferFund(req.body, adminId);
    return res.status(200).json({
      status: 200,
      message: "Fund transferred successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getFundTransferHistory(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id,
    };
    const data = await service.getFundTransferHistory(query);
    return res.status(200).json({
      status: 200,
      message: "Fund transfer history fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getVipLevels(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id,
    };
    const data = await service.getVipLevels(query);
    return res.status(200).json({
      status: 200,
      message: "VIP levels fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveVipLevel(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    const result = await service.saveVipLevel(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getLoginHistory(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id,
    };
    const data = await service.getLoginHistory(query);
    return res.status(200).json({
      status: 200,
      message: query.id ? "Login record fetched successfully" : "Login history fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getMlmLevels(req, res) {
  try {
    const query = {
      ...req.query,
      user_id: req.params?.userId ?? req.params?.id ?? req.query?.user_id ?? req.query?.userId,
    };
    const data = await service.getMlmLevels(query);
    const message = query.user_id
      ? "User MLM levels fetched successfully"
      : "MLM levels configuration fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveMlmLevel(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    const result = await service.saveMlmLevel(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getSalaryList(req, res) {
  try {
    const query = {
      ...req.query,
      user_id: req.params?.userId ?? req.params?.id ?? req.query?.user_id ?? req.query?.userId,
    };
    const data = await service.getSalaryList(query);
    return res.status(200).json({
      status: 200,
      message: "Salary list fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveSalary(req, res) {
  try {
    const result = await service.saveSalary(req.body);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getOffers(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id,
    };
    const data = await service.getOffers(query);
    const message = query.id ? "Offer fetched successfully" : "Offers fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveOffer(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    if (req.method === "DELETE" || req.query?.action === "delete") {
      payload.action = "delete";
    }
    const result = await service.saveOffer(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getGifts(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id,
    };
    const data = await service.getGifts(query);
    const message = query.id || query.code ? "Gift fetched successfully" : "Gifts history fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveGift(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    if (req.method === "DELETE" || req.query?.action === "delete") {
      payload.action = "delete";
    }
    const result = await service.saveGift(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getBanners(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id,
    };
    const data = await service.getBanners(query);
    const message = query.id ? "Activity banner fetched successfully" : "Activity & banners fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveBanner(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    if (req.method === "DELETE" || req.query?.action === "delete") {
      payload.action = "delete";
    }
    const result = await service.saveBanner(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getPaymentLimits(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id ?? req.query?.ID,
    };
    const data = await service.getPaymentLimits(query);
    const message = query.id ? "Payment limit fetched successfully" : "Payment limits fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function savePaymentLimit(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.body?.ID ?? req.params?.id,
      paramsId: req.params?.id,
    };
    if (req.method === "DELETE" || req.query?.action === "delete") {
      payload.action = "delete";
    }
    const result = await service.savePaymentLimit(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getDeposits(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id ?? req.query?.Id ?? req.query?.ID,
    };
    const data = await service.getDeposits(query);
    const message = query.id ? "Deposit fetched successfully" : "Deposits fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getPendingDeposits(req, res) {
  try {
    const query = {
      ...req.query,
      status: "pending",
    };
    const data = await service.getDeposits(query);
    return res.status(200).json({
      status: 200,
      message: "Pending deposits fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getSuccessDeposits(req, res) {
  try {
    const query = {
      ...req.query,
      status: "success",
    };
    const data = await service.getDeposits(query);
    return res.status(200).json({
      status: 200,
      message: "Success deposits fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getRejectDeposits(req, res) {
  try {
    const query = {
      ...req.query,
      status: "reject",
    };
    const data = await service.getDeposits(query);
    return res.status(200).json({
      status: 200,
      message: "Rejected deposits fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function updateDepositStatus(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.body?.Id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    const result = await service.updateDepositStatus(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getWithdrawals(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id ?? req.query?.Id ?? req.query?.ID,
    };
    const data = await service.getWithdrawals(query);
    const message = query.id ? "Withdrawal fetched successfully" : "Withdrawals fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getPendingWithdrawals(req, res) {
  try {
    const query = {
      ...req.query,
      status: "pending",
    };
    const data = await service.getWithdrawals(query);
    return res.status(200).json({
      status: 200,
      message: "Pending withdrawals fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getApprovedWithdrawals(req, res) {
  try {
    const query = {
      ...req.query,
      status: "approved",
    };
    const data = await service.getWithdrawals(query);
    return res.status(200).json({
      status: 200,
      message: "Approved withdrawals fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getRejectWithdrawals(req, res) {
  try {
    const query = {
      ...req.query,
      status: "reject",
    };
    const data = await service.getWithdrawals(query);
    return res.status(200).json({
      status: 200,
      message: "Rejected withdrawals fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function updateWithdrawalStatus(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.body?.Id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    const result = await service.updateWithdrawalStatus(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getSupportSettings(req, res) {
  try {
    const query = {
      ...req.query,
      id: req.params?.id ?? req.query?.id ?? req.query?.Id ?? req.query?.ID,
    };
    const data = await service.getSupportSettings(query);
    const message = query.id ? "Support setting fetched successfully" : "Support settings fetched successfully";
    return res.status(200).json({
      status: 200,
      message,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function saveSupportSetting(req, res) {
  try {
    const payload = {
      ...req.body,
      id: req.body?.id ?? req.body?.Id ?? req.params?.id,
      paramsId: req.params?.id,
    };
    if (req.method === "DELETE" || req.query?.action === "delete") {
      payload.action = "delete";
    }
    const result = await service.saveSupportSetting(payload);
    return res.status(200).json({
      status: 200,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getAviatorTelemetry(req, res) {
  try {
    const data = await service.getAviatorTelemetry(req.query);
    return res.status(200).json({
      status: 200,
      message: "Aviator telemetry and drop history fetched successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function getAviatorDrops(req, res) {
  try {
    const telemetry = await service.getAviatorTelemetry(req.query);
    return res.status(200).json({
      status: 200,
      message: "Aviator drop history fetched successfully",
      data: telemetry.drop_history,
      pagination: telemetry.pagination,
      total_drops: telemetry.pagination?.total || telemetry.drop_history.length,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

module.exports = {
  addPlayer,
  dashboard,
  dashboardCounts,
  getAttendance,
  getApprovedWithdrawals,
  getAviatorDrops,
  getAviatorTelemetry,
  getBanners,
  getDeposits,
  getFundTransferHistory,
  getGifts,
  getLoginHistory,
  getMlmLevels,
  getOffers,
  getPaymentLimits,
  getPendingDeposits,
  getPendingWithdrawals,
  getPlayerById,
  getPlayers,
  getRejectDeposits,
  getRejectWithdrawals,
  getSalaryList,
  getSuccessDeposits,
  getSupportSettings,
  getVipLevels,
  getWithdrawals,
  quickAddPlayer,
  saveAttendance,
  saveBanner,
  saveGift,
  saveMlmLevel,
  saveOffer,
  savePaymentLimit,
  saveSalary,
  saveSupportSetting,
  saveVipLevel,
  service,
  suspendPlayer,
  transferFund,
  unsuspendPlayer,
  updateDepositStatus,
  updatePlayerStatus,
  updateWithdrawalStatus,
};

