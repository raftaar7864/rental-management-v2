import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <Container className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, 20, -20, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            fontSize: 80,
            marginBottom: 20,
            display: "inline-block",
          }}
        >
          ❌
        </motion.div>

        <h1 className="mb-3">Payment Cancelled</h1>
        <p className="text-muted mb-4">
          You have cancelled the payment. No charges were processed.
        </p>

        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/")}
          >
            Go Back Home
          </Button>
        </motion.div>
      </motion.div>
    </Container>
  );
}
