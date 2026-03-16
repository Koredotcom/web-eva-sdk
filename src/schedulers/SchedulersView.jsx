import React, { useState, useEffect, useCallback } from "react";
import { getSchedulers, deleteSchedulerById, toggleScheduler } from "./index";
import { openSchedulerDialog } from "./schedulerUI.js";
import "./SchedulersView.scss";
import "./schedulerUI.scss";

const showToast = (message, variant = "danger") => {
  const container = document.querySelector(".sch-toast-container") || (() => {
    const el = document.createElement("div");
    el.className = "sch-toast-container";
    document.body.appendChild(el);
    return el;
  })();
  const toast = document.createElement("div");
  toast.className = `sch-toast sch-toast-${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add("sch-toast-exit"); setTimeout(() => toast.remove(), 300); }, 3000);
};

const SchedulersView = () => {
  const [schedulers, setSchedulers] = useState([]);

  const loadSchedulers = useCallback(async () => {
    const res = await getSchedulers();
    const list = res?.schedulers?.allAgents ?? res?.schedulers ?? res?.data;
    setSchedulers(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    loadSchedulers();
  }, [loadSchedulers]);

  const handleCreate = () => {
    openSchedulerDialog({
      agentDetails: { isCreateFlow: true },
      onComplete: loadSchedulers,
    });
  };

  const buildAgentDetails = (scheduler) => ({
    id: scheduler.agentId || scheduler.id,
    name: scheduler.agentName || scheduler.name,
    icon: scheduler.agentIcon || scheduler.icon,
    type: scheduler.agentType || scheduler.type,
    schedule: {
      id: scheduler.id || scheduler._id,
      config: scheduler.schedule?.config || scheduler.config,
      instruction: scheduler.schedule?.instruction || scheduler.instruction,
      notifications: scheduler.schedule?.notifications || scheduler.notifications,
      enabled: scheduler.schedule?.enabled ?? scheduler.enabled,
      canEdit: (scheduler.schedule?.canEdit ?? scheduler.canEdit) !== false,
    },
    sampleUtterances: scheduler.sampleUtterances,
  });

  const handleRowClick = (scheduler) => {
    openSchedulerDialog({
      agentDetails: buildAgentDetails(scheduler),
      onComplete: loadSchedulers,
    });
  };

  const handleDelete = async (e, scheduler) => {
    e.stopPropagation();
    const schedulerId = scheduler.id || scheduler._id;
    const result = await deleteSchedulerById(schedulerId);
    if (result.success) {
      setSchedulers((prev) => prev.filter((el) => (el.id || el._id) !== schedulerId));
    } else {
      showToast(result.error || "Unable to delete the schedule");
    }
  };

  const handleToggle = async (e, scheduler) => {
    e.stopPropagation();

    const agentObj = {
      ...scheduler,
      schedule: {
        id: scheduler.id || scheduler._id,
        config: scheduler.schedule?.config || scheduler.config,
        instruction: scheduler.schedule?.instruction || scheduler.instruction,
        notifications: scheduler.schedule?.notifications || scheduler.notifications,
        enabled: scheduler.schedule?.enabled ?? scheduler.enabled,
        canEdit: (scheduler.schedule?.canEdit ?? scheduler.canEdit) !== false,
      },
    };

    const result = await toggleScheduler(agentObj);

    if (result.openDialog) {
      openSchedulerDialog({
        agentDetails: buildAgentDetails(scheduler),
        onComplete: loadSchedulers,
      });
      return;
    }

    if (result.success) {
      setSchedulers((prev) =>
        prev.map((el) => {
          if ((el.id || el._id) !== (scheduler.id || scheduler._id)) return el;
          return {
            ...el,
            enabled: result.updatedSchedule.enabled,
            schedule: { ...el.schedule, ...result.updatedSchedule },
          };
        })
      );
    } else {
      showToast(result.error || "Unable to update the schedule");
    }
  };

  const isNotFound = (s) => s.notFound === true;
  const canEdit = (s) => !isNotFound(s) && (s.schedule?.canEdit ?? s.canEdit) !== false;
  const isEnabled = (s) => s.schedule?.enabled ?? s.enabled ?? false;

  return (
    <div className="schedulers-view">
      <nav className="schedulers-nav">
        <div className="schedulers-nav-item">Schedulers</div>
        <div className="schedulers-nav-item">Link Agent</div>
      </nav>

      <div className="schedulers-main">
        <p className="schedulers-lorem">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <h2 className="schedulers-heading">Link Agent using credentials</h2>

        <button type="button" className="schedulers-add-btn" onClick={handleCreate}>
          + Create
        </button>

        <div className="schedulers-list">
          {schedulers.length === 0 && <p className="schedulers-empty">No schedulers yet.</p>}
          {schedulers.map((s) => (
            <div
              key={s.id ?? s._id ?? s.name}
              className="schedulers-row"
              onClick={() => handleRowClick(s)}
              role="button"
              tabIndex={0}
            >
              <div className="schedulers-row-info">
                <span className="schedulers-row-name">{s.name || s.agentName || s.id}</span>
                {isNotFound(s) && <span className="schedulers-row-error">Agent not found</span>}
              </div>
              <div className="schedulers-row-actions">
                {canEdit(s) && (
                  <button
                    type="button"
                    className="schedulers-delete-btn"
                    onClick={(e) => handleDelete(e, s)}
                    title="Delete"
                  >
                    🗑
                  </button>
                )}
                <label className="schedulers-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isEnabled(s)}
                    disabled={isNotFound(s)}
                    onChange={(e) => handleToggle(e, s)}
                  />
                  <span className="schedulers-toggle-slider" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulersView;
