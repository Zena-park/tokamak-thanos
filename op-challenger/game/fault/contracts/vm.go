package contracts

import (
	"context"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/tokamak-network/tokamak-thanos/op-service/sources/batching"
	"github.com/tokamak-network/tokamak-thanos/op-service/sources/batching/rpcblock"
	"github.com/tokamak-network/tokamak-thanos/packages/contracts-bedrock/snapshots"
)

const (
	methodOracle = "oracle"
)

// VMContract is a binding that works with contracts implementing the IBigStepper interface
type VMContract struct {
	multiCaller *batching.MultiCaller
	contract    *batching.BoundContract
}

func NewVMContract(addr common.Address, caller *batching.MultiCaller) *VMContract {
	mipsAbi := snapshots.LoadMIPSABI()

	return &VMContract{
		multiCaller: caller,
		contract:    batching.NewBoundContract(mipsAbi, addr),
	}
}

func (c *VMContract) Addr() common.Address {
	return c.contract.Addr()
}

func (c *VMContract) Oracle(ctx context.Context) (*PreimageOracleContract, error) {
	results, err := c.multiCaller.SingleCall(ctx, rpcblock.Latest, c.contract.Call(methodOracle))
	if err != nil {
		return nil, fmt.Errorf("failed to load oracle address: %w", err)
	}
	return NewPreimageOracleContract(results.GetAddress(0), c.multiCaller), nil
}
