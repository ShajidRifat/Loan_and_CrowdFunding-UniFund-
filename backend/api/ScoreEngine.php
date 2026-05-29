<?php
// api/core/ScoreEngine.php

class ScoreEngine {
 
  private static array $events = [
    'EVT_01' => ['name' => 'On-time installment payment',      'delta' =>  10],
    'EVT_02' => ['name' => 'Full loan repaid',                  'delta' =>  25],
    'EVT_03' => ['name' => 'Campaign completed',               'delta' =>  15],
    'EVT_04' => ['name' => 'Late payment - Day 1',             'delta' => -10],
    'EVT_05' => ['name' => 'Late payment - Day 8',             'delta' => -25],
    'EVT_06' => ['name' => 'Late payment - Day 30+',           'delta' => -50],
    'EVT_07' => ['name' => 'Loan default declared',            'delta' => -75],
    'EVT_08' => ['name' => 'Fraud alert triggered',            'delta' => -100],
    'EVT_09' => ['name' => 'Fraud cleared - partial',          'delta' =>  30],
    'EVT_10' => ['name' => 'Account inactive 6+ months',       'delta' =>  -5],
    'EVT_11' => ['name' => 'KYC verification completed',       'delta' =>  20],
    'EVT_12' => ['name' => 'First loan taken',                 'delta' =>  10],
  ];
 
  private const MIN_SCORE = 300;
  private const MAX_SCORE = 850;
 
  /**
   * Apply a standard event from the delta registry to a student's profile.
   */
  public static function applyEvent(int $studentId, string $eventId, string $triggeredBy, PDO $pdo): array {
    if (!isset(self::$events[$eventId])) {
      throw new InvalidArgumentException("Unknown event: $eventId");
    }
    $event = self::$events[$eventId];
    return self::executeEngineTransaction($studentId, $eventId, $event['name'], (int)$event['delta'], $triggeredBy, $pdo);
  }

  /**
   * Apply a custom event with a dynamic delta (used for EVT_09F full reversals).
   */
  public static function applyCustomEvent(int $studentId, string $eventId, string $eventName, int $delta, string $triggeredBy, PDO $pdo): array {
    return self::executeEngineTransaction($studentId, $eventId, $eventName, $delta, $triggeredBy, $pdo);
  }
 
  /**
   * Handles the atomic transaction for updating the credit score, logging the history, and updating risk tier parameters.
   */
  private static function executeEngineTransaction(
    int $studentId, string $eventId, string $eventName, int $delta, string $triggeredBy, PDO $pdo
  ): array {
    $pdo->beginTransaction();
    try {
      // Step 5: Row-level lock (Blocks concurrent writes to prevent race conditions)
      $stmt = $pdo->prepare(
        "SELECT credit_score, account_status FROM student_profiles
         WHERE user_id = ? FOR UPDATE"
      );
      $stmt->execute([$studentId]);
      $profile = $stmt->fetch(PDO::FETCH_ASSOC);
 
      if (!$profile) {
        throw new RuntimeException("Student profile not found for user ID: $studentId");
      }
 
      // EVT_08 (Fraud alert) bypasses the active account check so we can lock suspended profiles
      if ($eventId !== 'EVT_08' && $profile['account_status'] !== 'active') {
        throw new RuntimeException("Account is currently locked or suspended (Status: " . $profile['account_status'] . ")");
      }
 
      // Apply delta and enforce hard boundaries (300 to 850)
      $scoreBefore = (int) $profile['credit_score'];
      $raw         = $scoreBefore + $delta;
      $scoreAfter  = max(self::MIN_SCORE, min(self::MAX_SCORE, $raw));
 
      // Resolve new account status
      $newStatus = $profile['account_status'];
      if ($eventId === 'EVT_08') {
        $newStatus = 'fraud_review';
      } elseif (in_array($eventId, ['EVT_09', 'EVT_09F'])) {
        $newStatus = 'active';
      }
 
      // Update student profiles table
      $pdo->prepare(
        "UPDATE student_profiles
         SET credit_score = ?, account_status = ?, score_last_updated = NOW()
         WHERE user_id = ?"
      )->execute([$scoreAfter, $newStatus, $studentId]);
 
      // Create immutable audit log entry
      $pdo->prepare(
        "INSERT INTO credit_score_history
         (student_id, event_id, event_name, delta, score_before, score_after, triggered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
      )->execute([
        $studentId, $eventId, $eventName, $delta, $scoreBefore, $scoreAfter, $triggeredBy
      ]);
 
      $pdo->commit();
 
      // Resolve current tier details and trust percentage
      $tier = self::resolveTier($scoreAfter, $pdo);
      $trustScore = round(($scoreAfter - self::MIN_SCORE) / (self::MAX_SCORE - self::MIN_SCORE) * 100);
 
      return [
        'score_before'  => $scoreBefore,
        'score_after'   => $scoreAfter,
        'trust_score'   => $trustScore,
        'risk_tier'     => $tier['tier_name'],
        'badge_color'   => $tier['badge_color'],
        'loan_limit'    => (int)$tier['max_loan_amount'],
        'account_status'=> $newStatus,
      ];
 
    } catch (Exception $e) {
      if ($pdo->inTransaction()) {
        $pdo->rollBack();
      }
      throw $e;
    }
  }
 
  /**
   * Dynamically query risk tier information using our strictly exclusive limits
   */
  private static function resolveTier(int $score, PDO $pdo): array {
    $stmt = $pdo->prepare(
      "SELECT tier_name, badge_color, max_loan_amount
       FROM risk_tiers
       WHERE ? >= min_score AND ? <= max_score"
    );
    $stmt->execute([$score, $score]);
    $res = $stmt->fetch(PDO::FETCH_ASSOC);
    return $res ?: [
      'tier_name' => 'Unknown',
      'badge_color' => 'slate',
      'max_loan_amount' => 0
    ];
  }
}
?>
